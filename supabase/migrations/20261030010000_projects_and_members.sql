-- ==============================================================================
-- MelBond - Phase 3 Schema: Projects, Roles, Invitations, & Membership
-- ==============================================================================

-- 1. Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    project_type TEXT NOT NULL DEFAULT 'other' CHECK (
        project_type IN ('course_assignment', 'software_project', 'research', 'fyp_capstone', 'other')
    ),
    course_code TEXT,
    semester TEXT,
    target_date TIMESTAMPTZ,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.projects IS 'Academic workspaces created by student teams.';
COMMENT ON COLUMN public.projects.project_type IS 'Category of project (assignment, research, FYDP, etc.)';
COMMENT ON COLUMN public.projects.is_archived IS 'Flag marking completed or archived projects.';

-- 2. Create project_members table
CREATE TABLE IF NOT EXISTS public.project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (
        role IN ('owner', 'admin', 'member')
    ),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_project_member UNIQUE (project_id, user_id)
);

COMMENT ON TABLE public.project_members IS 'Membership and role assignment within a project.';
COMMENT ON COLUMN public.project_members.role IS 'Member authorization level: owner, admin, or member.';

-- 3. Create project_invitations table
CREATE TABLE IF NOT EXISTS public.project_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    invitation_code TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (
        role IN ('admin', 'member')
    ),
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now() + interval '7 days'),
    max_uses INTEGER NOT NULL DEFAULT 5,
    uses_count INTEGER NOT NULL DEFAULT 0,
    is_revoked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.project_invitations IS 'Expiring, revocable, rate-limited join tokens.';

-- 4. Triggers to maintain updated_at on projects
DROP TRIGGER IF EXISTS on_projects_updated ON public.projects;
CREATE TRIGGER on_projects_updated
    BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. Helper security functions (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.project_members
        WHERE project_id = p_project_id AND user_id = p_user_id
    );
$$;

CREATE OR REPLACE FUNCTION public.get_project_role(p_project_id UUID, p_user_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT role FROM public.project_members
    WHERE project_id = p_project_id AND user_id = p_user_id
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_project_admin_or_owner(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.project_members
        WHERE project_id = p_project_id
          AND user_id = p_user_id
          AND role IN ('owner', 'admin')
    );
$$;

-- 1-argument overloads defaulting to auth.uid() for clean RLS policy expressions
CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT public.is_project_member(p_project_id, auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.get_project_role(p_project_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT public.get_project_role(p_project_id, auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_project_admin_or_owner(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT public.is_project_admin_or_owner(p_project_id, auth.uid());
$$;

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_invitations ENABLE ROW LEVEL SECURITY;

-- 7. Policies for projects
DROP POLICY IF EXISTS "Members can view their projects" ON public.projects;
CREATE POLICY "Members can view their projects"
    ON public.projects
    FOR SELECT
    TO authenticated
    USING (
        public.is_project_member(id, auth.uid()) OR created_by = auth.uid()
    );

DROP POLICY IF EXISTS "Authenticated users can create projects" ON public.projects;
CREATE POLICY "Authenticated users can create projects"
    ON public.projects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by = auth.uid()
    );

DROP POLICY IF EXISTS "Admins and owners can update projects" ON public.projects;
CREATE POLICY "Admins and owners can update projects"
    ON public.projects
    FOR UPDATE
    TO authenticated
    USING (
        public.is_project_admin_or_owner(id, auth.uid())
    )
    WITH CHECK (
        public.is_project_admin_or_owner(id, auth.uid())
    );

DROP POLICY IF EXISTS "Only owners can delete projects" ON public.projects;
CREATE POLICY "Only owners can delete projects"
    ON public.projects
    FOR DELETE
    TO authenticated
    USING (
        public.get_project_role(id, auth.uid()) = 'owner'
    );

-- 8. Policies for project_members
DROP POLICY IF EXISTS "Members can view project member list" ON public.project_members;
CREATE POLICY "Members can view project member list"
    ON public.project_members
    FOR SELECT
    TO authenticated
    USING (
        public.is_project_member(project_id, auth.uid())
    );

DROP POLICY IF EXISTS "Admins and owners can add members" ON public.project_members;
CREATE POLICY "Admins and owners can add members"
    ON public.project_members
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_project_admin_or_owner(project_id, auth.uid()) OR user_id = auth.uid()
    );

DROP POLICY IF EXISTS "Admins and owners can update member roles" ON public.project_members;
CREATE POLICY "Admins and owners can update member roles"
    ON public.project_members
    FOR UPDATE
    TO authenticated
    USING (
        public.is_project_admin_or_owner(project_id, auth.uid())
    )
    WITH CHECK (
        public.is_project_admin_or_owner(project_id, auth.uid())
    );

DROP POLICY IF EXISTS "Members can leave or admins can remove" ON public.project_members;
CREATE POLICY "Members can leave or admins can remove"
    ON public.project_members
    FOR DELETE
    TO authenticated
    USING (
        user_id = auth.uid() OR public.is_project_admin_or_owner(project_id, auth.uid())
    );

-- 9. Policies for project_invitations
DROP POLICY IF EXISTS "Project members can view active invitations" ON public.project_invitations;
CREATE POLICY "Project members can view active invitations"
    ON public.project_invitations
    FOR SELECT
    TO authenticated
    USING (
        public.is_project_member(project_id, auth.uid())
    );

DROP POLICY IF EXISTS "Admins and owners can create invitations" ON public.project_invitations;
CREATE POLICY "Admins and owners can create invitations"
    ON public.project_invitations
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_project_admin_or_owner(project_id, auth.uid()) AND created_by = auth.uid()
    );

DROP POLICY IF EXISTS "Admins and owners can update or revoke invitations" ON public.project_invitations;
CREATE POLICY "Admins and owners can update or revoke invitations"
    ON public.project_invitations
    FOR UPDATE
    TO authenticated
    USING (
        public.is_project_admin_or_owner(project_id, auth.uid())
    );

-- 10. RPC: Atomic project creation with owner
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

    INSERT INTO public.projects (
        name, description, project_type, course_code, semester, target_date, created_by
    ) VALUES (
        TRIM(p_name), p_description, p_project_type, p_course_code, p_semester, p_target_date, v_user_id
    ) RETURNING id INTO v_project_id;

    INSERT INTO public.project_members (
        project_id, user_id, role
    ) VALUES (
        v_project_id, v_user_id, 'owner'
    );

    RETURN v_project_id;
END;
$$;

-- 11. RPC: Atomic secure invitation redemption
CREATE OR REPLACE FUNCTION public.redeem_invitation(
    p_invitation_code TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invitation RECORD;
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO v_invitation
    FROM public.project_invitations
    WHERE invitation_code = TRIM(p_invitation_code)
      AND is_revoked = false
      AND expires_at > timezone('utc'::text, now())
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid, expired, or revoked invitation code';
    END IF;

    IF v_invitation.uses_count >= v_invitation.max_uses THEN
        RAISE EXCEPTION 'Invitation code has reached maximum uses';
    END IF;

    -- Check if already a member
    IF EXISTS (
        SELECT 1 FROM public.project_members
        WHERE project_id = v_invitation.project_id AND user_id = v_user_id
    ) THEN
        RAISE EXCEPTION 'You are already a member of this project';
    END IF;

    -- Add member
    INSERT INTO public.project_members (
        project_id, user_id, role
    ) VALUES (
        v_invitation.project_id, v_user_id, v_invitation.role
    );

    -- Increment usage
    UPDATE public.project_invitations
    SET uses_count = uses_count + 1
    WHERE id = v_invitation.id;

    RETURN v_invitation.project_id;
END;
$$;

-- 12. RPC: Leave project with owner invariant
CREATE OR REPLACE FUNCTION public.leave_project(
    p_project_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_role TEXT;
    v_owner_count INTEGER;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT role INTO v_role
    FROM public.project_members
    WHERE project_id = p_project_id AND user_id = v_user_id;

    IF v_role IS NULL THEN
        RAISE EXCEPTION 'You are not a member of this project';
    END IF;

    IF v_role = 'owner' THEN
        SELECT COUNT(*) INTO v_owner_count
        FROM public.project_members
        WHERE project_id = p_project_id AND role = 'owner';

        IF v_owner_count <= 1 THEN
            RAISE EXCEPTION 'Cannot leave project: you are the sole owner. Please transfer ownership or archive the project.';
        END IF;
    END IF;

    DELETE FROM public.project_members
    WHERE project_id = p_project_id AND user_id = v_user_id;
END;
$$;

-- 13. Ensure foreign key between project_members and profiles exists for PostgREST resource embedding
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_project_members_profile'
    ) THEN
        ALTER TABLE public.project_members
        ADD CONSTRAINT fk_project_members_profile
        FOREIGN KEY (user_id) REFERENCES public.profiles(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- 14. Ensure creator is always an owner member on project creation
CREATE OR REPLACE FUNCTION public.handle_project_creator_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.created_by IS NOT NULL THEN
        INSERT INTO public.project_members (project_id, user_id, role)
        VALUES (NEW.id, NEW.created_by, 'owner')
        ON CONFLICT (project_id, user_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_project_created_add_owner ON public.projects;
CREATE TRIGGER on_project_created_add_owner
    AFTER INSERT ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_project_creator_membership();

-- 15. Backfill missing profiles for existing auth.users
INSERT INTO public.profiles (id, email, full_name)
SELECT 
    u.id, 
    u.email, 
    COALESCE(u.raw_user_meta_data->>'full_name', split_part(COALESCE(u.email, 'User'), '@', 1))
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- 16. Backfill missing owner membership for any existing projects
INSERT INTO public.project_members (project_id, user_id, role)
SELECT p.id, p.created_by, 'owner'
FROM public.projects p
WHERE p.created_by IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = p.id AND pm.user_id = p.created_by
  )
ON CONFLICT (project_id, user_id) DO NOTHING;

