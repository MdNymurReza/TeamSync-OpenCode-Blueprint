-- ==============================================================================
-- MelBond - Phase 5 Schema: Task Management
-- ==============================================================================

-- 1. Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(trim(title)) > 0 AND char_length(title) <= 200),
    description TEXT,
    primary_assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'in_review', 'done')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    due_date TIMESTAMPTZ,
    start_date TIMESTAMPTZ,
    phase_id UUID REFERENCES public.project_phases(id) ON DELETE SET NULL,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    updated_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for tasks filtering and performance
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON public.tasks(project_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_project_assignee ON public.tasks(project_id, primary_assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_phase ON public.tasks(project_id, phase_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_due_date ON public.tasks(project_id, due_date);

-- 2. Create task_collaborators table
CREATE TABLE IF NOT EXISTS public.task_collaborators (
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_collaborators_user_id ON public.task_collaborators(user_id);

-- 3. Create task_checklist_items table
CREATE TABLE IF NOT EXISTS public.task_checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(trim(title)) > 0 AND char_length(title) <= 250),
    is_completed BOOLEAN NOT NULL DEFAULT false,
    sequence_order INTEGER NOT NULL DEFAULT 0 CHECK (sequence_order >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_task_checklist_task_order ON public.task_checklist_items(task_id, sequence_order);

-- 4. Create task_comments table
CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(trim(content)) > 0 AND char_length(content) <= 2000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task_created ON public.task_comments(task_id, created_at);

-- 5. Updated_at triggers
CREATE TRIGGER set_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_task_comments_updated_at
BEFORE UPDATE ON public.task_comments
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 6. Trigger to enforce Assignee Project Membership Invariant
CREATE OR REPLACE FUNCTION public.check_task_assignee_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.primary_assignee_id IS NOT NULL THEN
        IF NOT public.is_project_member(NEW.project_id, NEW.primary_assignee_id) THEN
            RAISE EXCEPTION 'Primary assignee must be an active member of this project';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_task_assignee_membership
BEFORE INSERT OR UPDATE OF primary_assignee_id, project_id ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.check_task_assignee_membership();

-- Trigger to enforce Collaborator Project Membership Invariant
CREATE OR REPLACE FUNCTION public.check_task_collaborator_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_project_id UUID;
BEGIN
    SELECT project_id INTO v_project_id
    FROM public.tasks
    WHERE id = NEW.task_id;

    IF v_project_id IS NULL THEN
        RAISE EXCEPTION 'Task not found';
    END IF;

    IF NOT public.is_project_member(v_project_id, NEW.user_id) THEN
        RAISE EXCEPTION 'Collaborator must be an active member of the project';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_task_collaborator_membership
BEFORE INSERT ON public.task_collaborators
FOR EACH ROW
EXECUTE FUNCTION public.check_task_collaborator_membership();

-- 7. Enable Row Level Security (RLS)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- 7.1 Ensure single-argument security helpers exist (defaulting to auth.uid())
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

-- 8. RLS Policies: tasks
-- SELECT: Members of the project can read tasks
CREATE POLICY "Project members can view project tasks"
ON public.tasks
FOR SELECT
TO authenticated
USING (public.is_project_member(project_id));

-- INSERT: Members of the project can create tasks
CREATE POLICY "Project members can create tasks"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (public.is_project_member(project_id) AND auth.uid() = created_by);

-- UPDATE: Project members can update tasks
CREATE POLICY "Project members can update tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (public.is_project_member(project_id))
WITH CHECK (public.is_project_member(project_id));

-- DELETE: Admins, owners, or task creator can delete tasks
CREATE POLICY "Admins owners or creators can delete tasks"
ON public.tasks
FOR DELETE
TO authenticated
USING (
    public.is_project_admin_or_owner(project_id)
    OR created_by = auth.uid()
);

-- 9. RLS Policies: task_collaborators
CREATE POLICY "Project members can view collaborators"
ON public.task_collaborators
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id = task_id AND public.is_project_member(t.project_id)
    )
);

CREATE POLICY "Project members can manage collaborators"
ON public.task_collaborators
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id = task_id AND public.is_project_member(t.project_id)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id = task_id AND public.is_project_member(t.project_id)
    )
);

-- 10. RLS Policies: task_checklist_items
CREATE POLICY "Project members can view checklist items"
ON public.task_checklist_items
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id = task_id AND public.is_project_member(t.project_id)
    )
);

CREATE POLICY "Project members can manage checklist items"
ON public.task_checklist_items
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id = task_id AND public.is_project_member(t.project_id)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id = task_id AND public.is_project_member(t.project_id)
    )
);

-- 11. RLS Policies: task_comments
CREATE POLICY "Project members can view task comments"
ON public.task_comments
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id = task_id AND public.is_project_member(t.project_id)
    )
);

CREATE POLICY "Project members can insert task comments"
ON public.task_comments
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id = task_id AND public.is_project_member(t.project_id)
    )
);

CREATE POLICY "Comment authors or admins can delete comments"
ON public.task_comments
FOR DELETE
TO authenticated
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id = task_id AND public.is_project_admin_or_owner(t.project_id)
    )
);
