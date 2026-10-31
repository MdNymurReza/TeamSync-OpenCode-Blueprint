-- ==============================================================================
-- MelBond - Phase 4 Schema: Playbooks and Project Phases
-- ==============================================================================

-- 1. Create project_phases table
CREATE TABLE IF NOT EXISTS public.project_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (char_length(trim(name)) > 0 AND char_length(name) <= 100),
    description TEXT,
    sequence_order INTEGER NOT NULL DEFAULT 0 CHECK (sequence_order >= 0),
    is_completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for ordering within a project
CREATE INDEX IF NOT EXISTS idx_project_phases_project_order
ON public.project_phases(project_id, sequence_order);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.project_phases ENABLE ROW LEVEL SECURITY;

-- 2.1 Ensure single-argument security helpers exist (defaulting to auth.uid())
CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.project_members
        WHERE project_id = p_project_id AND user_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.is_project_admin_or_owner(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.project_members
        WHERE project_id = p_project_id
          AND user_id = auth.uid()
          AND role IN ('owner', 'admin')
    );
$$;

-- 3. RLS Policies
-- SELECT: Any member of the project can read phases
CREATE POLICY "Project members can view project phases"
ON public.project_phases
FOR SELECT
TO authenticated
USING (public.is_project_member(project_id));

-- INSERT: Only admins and owners can add phases
CREATE POLICY "Project admins and owners can insert phases"
ON public.project_phases
FOR INSERT
TO authenticated
WITH CHECK (public.is_project_admin_or_owner(project_id));

-- UPDATE: Only admins and owners can update phases
CREATE POLICY "Project admins and owners can update phases"
ON public.project_phases
FOR UPDATE
TO authenticated
USING (public.is_project_admin_or_owner(project_id))
WITH CHECK (public.is_project_admin_or_owner(project_id));

-- DELETE: Only admins and owners can delete phases
CREATE POLICY "Project admins and owners can delete phases"
ON public.project_phases
FOR DELETE
TO authenticated
USING (public.is_project_admin_or_owner(project_id));

-- 4. Trigger for updated_at timestamp
CREATE TRIGGER set_project_phases_updated_at
BEFORE UPDATE ON public.project_phases
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 5. Helper Function / RPC: Seed Playbook Phases
-- Takes a project ID and template type, inserting standard student project phases
CREATE OR REPLACE FUNCTION public.seed_project_phases(
    p_project_id UUID,
    p_template_type TEXT DEFAULT 'other'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verify caller is admin or owner
    IF NOT public.is_project_admin_or_owner(p_project_id) THEN
        RAISE EXCEPTION 'Not authorized to configure phases for this project';
    END IF;

    -- Delete any existing phases for this project
    DELETE FROM public.project_phases WHERE project_id = p_project_id;

    CASE p_template_type
        WHEN 'course_assignment' THEN
            INSERT INTO public.project_phases (project_id, name, description, sequence_order) VALUES
            (p_project_id, 'Requirements & Problem Breakdown', 'Deconstruct prompt, rubrics, constraints, and success criteria', 0),
            (p_project_id, 'Design & Task Division', 'Architecture, mockups, modular division, and milestones', 1),
            (p_project_id, 'Implementation & Peer Review', 'Core development, integration testing, and team code reviews', 2),
            (p_project_id, 'Final Polish & Submission', 'Report drafting, presentation slides, rubric check, and handover', 3);

        WHEN 'software_project' THEN
            INSERT INTO public.project_phases (project_id, name, description, sequence_order) VALUES
            (p_project_id, 'Planning & Tech Stack', 'User stories, system architecture, repo setup, and tool selection', 0),
            (p_project_id, 'MVP Development', 'Core feature implementation, database models, and internal APIs', 1),
            (p_project_id, 'Testing & Code Review', 'Unit/integration tests, bug fixes, performance, and security checks', 2),
            (p_project_id, 'Deployment & Documentation', 'CI/CD pipeline, user documentation, README, and demo recording', 3);

        WHEN 'research' THEN
            INSERT INTO public.project_phases (project_id, name, description, sequence_order) VALUES
            (p_project_id, 'Literature Review & Hypothesis', 'Background reading, gap analysis, and formulating research questions', 0),
            (p_project_id, 'Methodology & Data Collection', 'Experimental design, dataset sourcing, ethics/approvals, and tooling', 1),
            (p_project_id, 'Data Analysis & Findings', 'Running experiments, statistical validation, and result synthesis', 2),
            (p_project_id, 'Paper Draft & Presentation', 'Manuscript writing, citations, peer feedback, and presentation defense', 3);

        WHEN 'fyp_capstone' THEN
            INSERT INTO public.project_phases (project_id, name, description, sequence_order) VALUES
            (p_project_id, 'Proposal & Feasibility Study', 'Project charter, supervisor approval, literature survey, and feasibility', 0),
            (p_project_id, 'System Architecture & Specification', 'Detailed requirements, UX wireframes, and schema specifications', 1),
            (p_project_id, 'Build & Mid-Semester Review', 'Prototype implementation, interim demonstration, and supervisor check-in', 2),
            (p_project_id, 'Evaluation, Thesis & Defense', 'User evaluations, final thesis writeup, poster session, and oral defense', 3);

        ELSE
            -- 'other' or default general workflow
            INSERT INTO public.project_phases (project_id, name, description, sequence_order) VALUES
            (p_project_id, 'Discovery & Scoping', 'Define objectives, deliverables, and team responsibilities', 0),
            (p_project_id, 'Execution & Iteration', 'Main sprint cycle, weekly check-ins, and draft deliverables', 1),
            (p_project_id, 'Final Review & Delivery', 'Consolidated deliverables, retrospective, and project submission', 2);
    END CASE;
END;
$$;

-- 6. RPC: Atomic Reorder Project Phases
CREATE OR REPLACE FUNCTION public.reorder_project_phases(
    p_project_id UUID,
    p_phase_ids UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_phase_id UUID;
    v_order INTEGER := 0;
    v_count INTEGER;
BEGIN
    -- Verify caller is admin or owner
    IF NOT public.is_project_admin_or_owner(p_project_id) THEN
        RAISE EXCEPTION 'Not authorized to reorder phases for this project';
    END IF;

    -- Verify that all supplied phase IDs belong to the given project
    SELECT COUNT(*) INTO v_count
    FROM public.project_phases
    WHERE project_id = p_project_id AND id = ANY(p_phase_ids);

    IF v_count <> array_length(p_phase_ids, 1) THEN
        RAISE EXCEPTION 'One or more phase IDs do not belong to this project';
    END IF;

    -- Update sequence order atomically
    FOREACH v_phase_id IN ARRAY p_phase_ids
    LOOP
        UPDATE public.project_phases
        SET sequence_order = v_order,
            updated_at = timezone('utc'::text, now())
        WHERE id = v_phase_id AND project_id = p_project_id;

        v_order := v_order + 1;
    END LOOP;
END;
$$;

-- 7. Update create_project_with_owner to automatically seed playbook phases
CREATE OR REPLACE FUNCTION public.create_project_with_owner(
    p_name TEXT,
    p_description TEXT DEFAULT NULL,
    p_project_type TEXT DEFAULT 'other',
    p_course_code TEXT DEFAULT NULL,
    p_semester TEXT DEFAULT NULL,
    p_target_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_project_id UUID;
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF TRIM(COALESCE(p_name, '')) = '' THEN
        RAISE EXCEPTION 'Project name cannot be empty';
    END IF;

    -- Insert project
    INSERT INTO public.projects (
        name, description, project_type, course_code, semester, target_date, created_by
    ) VALUES (
        TRIM(p_name), p_description, p_project_type, p_course_code, p_semester, p_target_date, v_user_id
    ) RETURNING id INTO v_project_id;

    -- Insert owner membership
    INSERT INTO public.project_members (
        project_id, user_id, role
    ) VALUES (
        v_project_id, v_user_id, 'owner'
    );

    -- Automatically seed default playbook phases based on project_type
    PERFORM public.seed_project_phases(v_project_id, p_project_type);

    RETURN v_project_id;
END;
$$;
