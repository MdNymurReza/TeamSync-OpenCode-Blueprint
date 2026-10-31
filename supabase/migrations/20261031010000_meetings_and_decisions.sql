-- ==============================================================================
-- MelBond - Phase 7 Schema: Meetings, Minutes, Action Items, and Decisions
-- ==============================================================================

-- 1. Create meetings table
CREATE TABLE IF NOT EXISTS public.meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    phase_id UUID REFERENCES public.project_phases(id) ON DELETE SET NULL,
    title TEXT NOT NULL CHECK (char_length(trim(title)) > 0 AND char_length(title) <= 200),
    agenda TEXT,
    location_or_link TEXT,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
    minutes_summary TEXT,
    -- Optional attendance record; never used as productivity evidence or member ranking (PRD FR-06)
    attendee_ids UUID[] NOT NULL DEFAULT '{}'::UUID[],
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT meetings_time_order_check CHECK (ends_at IS NULL OR ends_at >= starts_at)
);

CREATE INDEX IF NOT EXISTS idx_meetings_project_id ON public.meetings(project_id);
CREATE INDEX IF NOT EXISTS idx_meetings_project_starts_at ON public.meetings(project_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_meetings_project_status ON public.meetings(project_id, status);

CREATE TRIGGER set_meetings_updated_at
BEFORE UPDATE ON public.meetings
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 2. Create meeting_action_items table
CREATE TABLE IF NOT EXISTS public.meeting_action_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(trim(title)) > 0 AND char_length(title) <= 300),
    assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    due_date TIMESTAMPTZ,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    -- Idempotent conversion link: once converted to a task, stores the task_id so it is not duplicated
    converted_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_meeting_action_items_meeting_id ON public.meeting_action_items(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_action_items_project_id ON public.meeting_action_items(project_id);
CREATE INDEX IF NOT EXISTS idx_meeting_action_items_converted_task_id ON public.meeting_action_items(converted_task_id);

CREATE TRIGGER set_meeting_action_items_updated_at
BEFORE UPDATE ON public.meeting_action_items
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 3. Create decisions table (PRD FR-07)
CREATE TABLE IF NOT EXISTS public.decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(trim(title)) > 0 AND char_length(title) <= 200),
    description TEXT NOT NULL CHECK (char_length(trim(description)) > 0),
    context_reason TEXT,
    status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'accepted', 'rejected', 'superseded')),
    decided_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    meeting_id UUID REFERENCES public.meetings(id) ON DELETE SET NULL,
    task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    milestone_id UUID REFERENCES public.milestones(id) ON DELETE SET NULL,
    supersedes_id UUID REFERENCES public.decisions(id) ON DELETE SET NULL,
    superseded_by_id UUID REFERENCES public.decisions(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_decisions_project_id ON public.decisions(project_id);
CREATE INDEX IF NOT EXISTS idx_decisions_project_status ON public.decisions(project_id, status);
CREATE INDEX IF NOT EXISTS idx_decisions_meeting_id ON public.decisions(meeting_id);

CREATE TRIGGER set_decisions_updated_at
BEFORE UPDATE ON public.decisions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 4. Cross-project and membership integrity triggers
-- 4.1 Ensure meeting.phase_id belongs to the same project_id
CREATE OR REPLACE FUNCTION public.check_meeting_phase_project()
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
            RAISE EXCEPTION 'Phase must belong to the same project as the meeting';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_meeting_phase_project
BEFORE INSERT OR UPDATE OF phase_id, project_id ON public.meetings
FOR EACH ROW
EXECUTE FUNCTION public.check_meeting_phase_project();

-- 4.2 Ensure meeting_action_item references belong to the same project_id and assignee is a project member
CREATE OR REPLACE FUNCTION public.check_meeting_action_item_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_meeting_project_id UUID;
    v_task_project_id UUID;
BEGIN
    SELECT project_id INTO v_meeting_project_id
    FROM public.meetings
    WHERE id = NEW.meeting_id;

    IF v_meeting_project_id IS NULL OR v_meeting_project_id <> NEW.project_id THEN
        RAISE EXCEPTION 'Action item must belong to the same project as its meeting';
    END IF;

    IF NEW.assignee_id IS NOT NULL AND NOT public.is_project_member(NEW.project_id, NEW.assignee_id) THEN
        RAISE EXCEPTION 'Action item assignee must be an active member of the project';
    END IF;

    IF NEW.converted_task_id IS NOT NULL THEN
        SELECT project_id INTO v_task_project_id
        FROM public.tasks
        WHERE id = NEW.converted_task_id;

        IF v_task_project_id IS NULL OR v_task_project_id <> NEW.project_id THEN
            RAISE EXCEPTION 'Converted task must belong to the same project as the action item';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_meeting_action_item_integrity
BEFORE INSERT OR UPDATE ON public.meeting_action_items
FOR EACH ROW
EXECUTE FUNCTION public.check_meeting_action_item_integrity();

-- 4.3 Ensure decision references belong to the same project_id
CREATE OR REPLACE FUNCTION public.check_decision_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ref_project_id UUID;
BEGIN
    IF NEW.meeting_id IS NOT NULL THEN
        SELECT project_id INTO v_ref_project_id FROM public.meetings WHERE id = NEW.meeting_id;
        IF v_ref_project_id IS NULL OR v_ref_project_id <> NEW.project_id THEN
            RAISE EXCEPTION 'Linked meeting must belong to the same project as the decision';
        END IF;
    END IF;

    IF NEW.task_id IS NOT NULL THEN
        SELECT project_id INTO v_ref_project_id FROM public.tasks WHERE id = NEW.task_id;
        IF v_ref_project_id IS NULL OR v_ref_project_id <> NEW.project_id THEN
            RAISE EXCEPTION 'Linked task must belong to the same project as the decision';
        END IF;
    END IF;

    IF NEW.milestone_id IS NOT NULL THEN
        SELECT project_id INTO v_ref_project_id FROM public.milestones WHERE id = NEW.milestone_id;
        IF v_ref_project_id IS NULL OR v_ref_project_id <> NEW.project_id THEN
            RAISE EXCEPTION 'Linked milestone must belong to the same project as the decision';
        END IF;
    END IF;

    IF NEW.supersedes_id IS NOT NULL THEN
        SELECT project_id INTO v_ref_project_id FROM public.decisions WHERE id = NEW.supersedes_id;
        IF v_ref_project_id IS NULL OR v_ref_project_id <> NEW.project_id THEN
            RAISE EXCEPTION 'Superseded decision must belong to the same project';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_decision_integrity
BEFORE INSERT OR UPDATE ON public.decisions
FOR EACH ROW
EXECUTE FUNCTION public.check_decision_integrity();

-- 4.4 Preserve accepted decision history (Architecture invariant: Decision history is not silently overwritten)
CREATE OR REPLACE FUNCTION public.protect_decision_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.status IN ('accepted', 'superseded') THEN
            RAISE EXCEPTION 'Accepted or superseded decisions cannot be deleted; supersede them instead to preserve decision history';
        END IF;
        RETURN OLD;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF OLD.status IN ('accepted', 'superseded') THEN
            IF NEW.title <> OLD.title OR NEW.description <> OLD.description OR COALESCE(NEW.context_reason, '') <> COALESCE(OLD.context_reason, '') THEN
                RAISE EXCEPTION 'Accepted decision content is immutable; create a superseding decision to record changes';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_decision_history_protection
BEFORE UPDATE OR DELETE ON public.decisions
FOR EACH ROW
EXECUTE FUNCTION public.protect_decision_history();

-- 5. Idempotent RPC to convert a meeting action item into a project task
CREATE OR REPLACE FUNCTION public.convert_action_item_to_task(
    p_action_item_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_item public.meeting_action_items%ROWTYPE;
    v_meeting public.meetings%ROWTYPE;
    v_task_id UUID;
BEGIN
    SELECT * INTO v_item
    FROM public.meeting_action_items
    WHERE id = p_action_item_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Action item not found';
    END IF;

    IF NOT public.is_project_member(v_item.project_id) THEN
        RAISE EXCEPTION 'Access denied: not a project member';
    END IF;

    -- Idempotency check: if already converted to an active task, return existing task_id
    IF v_item.converted_task_id IS NOT NULL THEN
        RETURN v_item.converted_task_id;
    END IF;

    SELECT * INTO v_meeting
    FROM public.meetings
    WHERE id = v_item.meeting_id;

    INSERT INTO public.tasks (
        project_id,
        title,
        description,
        primary_assignee_id,
        due_date,
        phase_id,
        status,
        priority,
        created_by
    ) VALUES (
        v_item.project_id,
        v_item.title,
        'Created from meeting action item: ' || COALESCE(v_meeting.title, 'Team Meeting'),
        v_item.assignee_id,
        v_item.due_date,
        v_meeting.phase_id,
        CASE WHEN v_item.is_completed THEN 'done' ELSE 'todo' END,
        'medium',
        auth.uid()
    )
    RETURNING id INTO v_task_id;

    UPDATE public.meeting_action_items
    SET converted_task_id = v_task_id,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_action_item_id;

    RETURN v_task_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.convert_action_item_to_task(UUID) TO authenticated;

-- 6. Enable Row Level Security (RLS) on meetings, meeting_action_items, and decisions
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;

-- 6.1 Meetings Policies
CREATE POLICY "Project members can view project meetings"
ON public.meetings
FOR SELECT
TO authenticated
USING (public.is_project_member(project_id));

CREATE POLICY "Project members can create meetings"
ON public.meetings
FOR INSERT
TO authenticated
WITH CHECK (public.is_project_member(project_id) AND auth.uid() = created_by);

CREATE POLICY "Project members can update meetings"
ON public.meetings
FOR UPDATE
TO authenticated
USING (public.is_project_member(project_id))
WITH CHECK (public.is_project_member(project_id));

CREATE POLICY "Admins owners or creators can delete meetings"
ON public.meetings
FOR DELETE
TO authenticated
USING (
    public.is_project_admin_or_owner(project_id)
    OR created_by = auth.uid()
);

-- 6.2 Meeting Action Items Policies
CREATE POLICY "Project members can view meeting action items"
ON public.meeting_action_items
FOR SELECT
TO authenticated
USING (public.is_project_member(project_id));

CREATE POLICY "Project members can create meeting action items"
ON public.meeting_action_items
FOR INSERT
TO authenticated
WITH CHECK (public.is_project_member(project_id) AND auth.uid() = created_by);

CREATE POLICY "Project members can update meeting action items"
ON public.meeting_action_items
FOR UPDATE
TO authenticated
USING (public.is_project_member(project_id))
WITH CHECK (public.is_project_member(project_id));

CREATE POLICY "Admins owners or creators can delete meeting action items"
ON public.meeting_action_items
FOR DELETE
TO authenticated
USING (
    public.is_project_admin_or_owner(project_id)
    OR created_by = auth.uid()
);

-- 6.3 Decisions Policies
CREATE POLICY "Project members can view project decisions"
ON public.decisions
FOR SELECT
TO authenticated
USING (public.is_project_member(project_id));

CREATE POLICY "Project members can create decisions"
ON public.decisions
FOR INSERT
TO authenticated
WITH CHECK (public.is_project_member(project_id) AND auth.uid() = created_by);

CREATE POLICY "Project members can update decisions"
ON public.decisions
FOR UPDATE
TO authenticated
USING (public.is_project_member(project_id))
WITH CHECK (public.is_project_member(project_id));

CREATE POLICY "Admins owners or creators can delete proposed or rejected decisions"
ON public.decisions
FOR DELETE
TO authenticated
USING (
    status IN ('proposed', 'rejected')
    AND (
        public.is_project_admin_or_owner(project_id)
        OR created_by = auth.uid()
    )
);

