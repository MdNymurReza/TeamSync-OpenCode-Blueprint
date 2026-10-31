-- ==============================================================================
-- MelBond - Phase 6 Schema: Milestones and Timeline
-- ==============================================================================

-- 1. Create milestones table
CREATE TABLE IF NOT EXISTS public.milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    phase_id UUID REFERENCES public.project_phases(id) ON DELETE SET NULL,
    title TEXT NOT NULL CHECK (char_length(trim(title)) > 0 AND char_length(title) <= 200),
    description TEXT,
    target_date TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'in_progress', 'completed')),
    progress_mode TEXT NOT NULL DEFAULT 'auto' CHECK (progress_mode IN ('auto', 'manual')),
    manual_progress INTEGER NOT NULL DEFAULT 0 CHECK (manual_progress >= 0 AND manual_progress <= 100),
    sequence_order INTEGER NOT NULL DEFAULT 0 CHECK (sequence_order >= 0),
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_milestones_project_id ON public.milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_milestones_project_target_date ON public.milestones(project_id, target_date);
CREATE INDEX IF NOT EXISTS idx_milestones_project_status ON public.milestones(project_id, status);

-- 2. Link tasks to milestones (ON DELETE SET NULL so deleting a milestone never deletes tasks)
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS milestone_id UUID REFERENCES public.milestones(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_project_milestone ON public.tasks(project_id, milestone_id);

-- 3. Updated_at trigger for milestones
CREATE TRIGGER set_milestones_updated_at
BEFORE UPDATE ON public.milestones
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 4. Cross-project integrity triggers
-- 4.1 Ensure milestone.phase_id belongs to the same project_id
CREATE OR REPLACE FUNCTION public.check_milestone_phase_project()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_phase_project_id UUID;
BEGIN
    IF NEW.phase_id IS NOT NULL THEN
        SELECT project_id INTO v_phase_project_id
        FROM public.project_phases
        WHERE id = NEW.phase_id;

        IF v_phase_project_id IS NULL OR v_phase_project_id <> NEW.project_id THEN
            RAISE EXCEPTION 'Phase must belong to the same project as the milestone';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_milestone_phase_project
BEFORE INSERT OR UPDATE OF phase_id, project_id ON public.milestones
FOR EACH ROW
EXECUTE FUNCTION public.check_milestone_phase_project();

-- 4.2 Ensure task.milestone_id belongs to the same project_id as the task
CREATE OR REPLACE FUNCTION public.check_task_milestone_project()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_milestone_project_id UUID;
BEGIN
    IF NEW.milestone_id IS NOT NULL THEN
        SELECT project_id INTO v_milestone_project_id
        FROM public.milestones
        WHERE id = NEW.milestone_id;

        IF v_milestone_project_id IS NULL OR v_milestone_project_id <> NEW.project_id THEN
            RAISE EXCEPTION 'Milestone must belong to the same project as the task';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_task_milestone_project
BEFORE INSERT OR UPDATE OF milestone_id, project_id ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.check_task_milestone_project();

-- 5. Enable Row Level Security (RLS) on milestones
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

-- SELECT: Project members can view milestones
CREATE POLICY "Project members can view project milestones"
ON public.milestones
FOR SELECT
TO authenticated
USING (public.is_project_member(project_id));

-- INSERT: Project members can create milestones
CREATE POLICY "Project members can create milestones"
ON public.milestones
FOR INSERT
TO authenticated
WITH CHECK (public.is_project_member(project_id) AND auth.uid() = created_by);

-- UPDATE: Project members can update milestones
CREATE POLICY "Project members can update milestones"
ON public.milestones
FOR UPDATE
TO authenticated
USING (public.is_project_member(project_id))
WITH CHECK (public.is_project_member(project_id));

-- DELETE: Project admins/owners or milestone creator can delete milestones
CREATE POLICY "Admins owners or creators can delete milestones"
ON public.milestones
FOR DELETE
TO authenticated
USING (
    public.is_project_admin_or_owner(project_id)
    OR created_by = auth.uid()
);

