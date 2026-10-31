-- ==============================================================================
-- MelBond - Phase 9 Schema: Activity Stream, Notifications, Team Pulse, and Search
-- ==============================================================================

-- 1. Create activity_events table (Append-only audit log per PRD FR-09, Architecture Section 5)
CREATE TABLE IF NOT EXISTS public.activity_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (
        event_type IN (
            'task_created',
            'task_completed',
            'task_assigned',
            'milestone_created',
            'milestone_completed',
            'meeting_scheduled',
            'minutes_recorded',
            'decision_accepted',
            'decision_superseded',
            'resource_shared',
            'pulse_submitted'
        )
    ),
    entity_type TEXT NOT NULL CHECK (
        entity_type IN ('task', 'milestone', 'meeting', 'decision', 'resource', 'pulse')
    ),
    entity_id UUID NOT NULL,
    summary_text TEXT NOT NULL CHECK (char_length(trim(summary_text)) > 0 AND char_length(summary_text) <= 240),
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_activity_events_project_created ON public.activity_events(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_events_actor ON public.activity_events(actor_id);

-- 1.1 Append-only protection trigger for activity_events
CREATE OR REPLACE FUNCTION public.protect_activity_events_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RAISE EXCEPTION 'Activity events are append-only and cannot be modified or deleted directly';
END;
$$;

CREATE TRIGGER enforce_activity_events_append_only
BEFORE UPDATE OR DELETE ON public.activity_events
FOR EACH ROW
EXECUTE FUNCTION public.protect_activity_events_immutability();

-- 2. Create notification_preferences table (PRD FR-09)
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    task_assignments BOOLEAN NOT NULL DEFAULT true,
    task_updates BOOLEAN NOT NULL DEFAULT true,
    mentions BOOLEAN NOT NULL DEFAULT true,
    deadline_reminders BOOLEAN NOT NULL DEFAULT true,
    meeting_reminders BOOLEAN NOT NULL DEFAULT true,
    team_pulse_reminders BOOLEAN NOT NULL DEFAULT true,
    minimize_lock_screen_content BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER set_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 3. Create notification_deliveries table (Idempotent & deduplicated reminder ledger)
CREATE TABLE IF NOT EXISTS public.notification_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (
        category IN (
            'task_assignment',
            'task_update',
            'mention',
            'deadline_reminder',
            'meeting_reminder',
            'pulse_reminder'
        )
    ),
    dedupe_key TEXT NOT NULL CHECK (char_length(trim(dedupe_key)) > 0 AND char_length(dedupe_key) <= 200),
    title TEXT NOT NULL CHECK (char_length(trim(title)) > 0 AND char_length(title) <= 140),
    body TEXT NOT NULL CHECK (char_length(trim(body)) > 0 AND char_length(body) <= 280),
    is_read BOOLEAN NOT NULL DEFAULT false,
    delivered_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT notification_deliveries_user_dedupe_unique UNIQUE (user_id, dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_user_delivered ON public.notification_deliveries(user_id, delivered_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_project ON public.notification_deliveries(project_id);

-- 3.1 Verify recipient is an active project member before recording/delivering any notification
CREATE OR REPLACE FUNCTION public.check_notification_recipient_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_project_member(NEW.project_id, NEW.user_id) THEN
        RAISE EXCEPTION 'Cannot deliver project notification to a non-member';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_notification_recipient_membership
BEFORE INSERT OR UPDATE ON public.notification_deliveries
FOR EACH ROW
EXECUTE FUNCTION public.check_notification_recipient_membership();

-- 4. Create team_pulse_checkins table (PRD FR-11)
-- Self-reports for support coordination only; never used as verified productivity measures or rankings.
CREATE TABLE IF NOT EXISTS public.team_pulse_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('on_track', 'needs_support', 'blocked')),
    blocker_details TEXT CHECK (blocker_details IS NULL OR char_length(blocker_details) <= 500),
    follow_up_note TEXT CHECK (follow_up_note IS NULL OR char_length(follow_up_note) <= 500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT team_pulse_unique_weekly_checkin UNIQUE (project_id, user_id, week_start_date)
);

CREATE INDEX IF NOT EXISTS idx_team_pulse_project_week ON public.team_pulse_checkins(project_id, week_start_date DESC);

CREATE TRIGGER set_team_pulse_checkins_updated_at
BEFORE UPDATE ON public.team_pulse_checkins
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 5. Enable Row Level Security (RLS) on all Phase 9 tables
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_pulse_checkins ENABLE ROW LEVEL SECURITY;

-- 5.1 Activity Events Policies (Project members only; never leak private project activity)
CREATE POLICY "Project members can view project activity events"
ON public.activity_events
FOR SELECT
TO authenticated
USING (public.is_project_member(project_id));

CREATE POLICY "Project members can record activity events"
ON public.activity_events
FOR INSERT
TO authenticated
WITH CHECK (public.is_project_member(project_id) AND auth.uid() = actor_id);

-- 5.2 Notification Preferences Policies (User owns their own preferences)
CREATE POLICY "Users can view their own notification preferences"
ON public.notification_preferences
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences"
ON public.notification_preferences
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences"
ON public.notification_preferences
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5.3 Notification Deliveries Policies (Re-checks active project membership at read time)
CREATE POLICY "Users can view their own authorized notifications"
ON public.notification_deliveries
FOR SELECT
TO authenticated
USING (auth.uid() = user_id AND public.is_project_member(project_id));

CREATE POLICY "Project members can create deduplicated notifications"
ON public.notification_deliveries
FOR INSERT
TO authenticated
WITH CHECK (public.is_project_member(project_id));

CREATE POLICY "Users can mark their own notifications as read"
ON public.notification_deliveries
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND public.is_project_member(project_id))
WITH CHECK (auth.uid() = user_id AND public.is_project_member(project_id));

-- 5.4 Team Pulse Check-ins Policies
CREATE POLICY "Project members can view team pulse checkins"
ON public.team_pulse_checkins
FOR SELECT
TO authenticated
USING (public.is_project_member(project_id));

CREATE POLICY "Project members can submit their own team pulse checkin"
ON public.team_pulse_checkins
FOR INSERT
TO authenticated
WITH CHECK (public.is_project_member(project_id) AND auth.uid() = user_id);

CREATE POLICY "Project members can update their own team pulse checkin or follow up"
ON public.team_pulse_checkins
FOR UPDATE
TO authenticated
USING (public.is_project_member(project_id))
WITH CHECK (public.is_project_member(project_id));

