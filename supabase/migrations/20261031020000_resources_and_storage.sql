-- ==============================================================================
-- MelBond - Phase 8 Schema: Resource Hub and Private Uploads
-- ==============================================================================

-- 1. Create resources table (PRD FR-08, Architecture Section 5 & 10)
CREATE TABLE IF NOT EXISTS public.resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    milestone_id UUID REFERENCES public.milestones(id) ON DELETE SET NULL,
    title TEXT NOT NULL CHECK (char_length(trim(title)) > 0 AND char_length(title) <= 200),
    description TEXT,
    category TEXT NOT NULL DEFAULT 'research' CHECK (
        category IN ('research', 'datasets', 'design', 'code', 'reports', 'presentations', 'other')
    ),
    custom_category TEXT CHECK (custom_category IS NULL OR char_length(trim(custom_category)) <= 60),
    resource_type TEXT NOT NULL CHECK (resource_type IN ('external_link', 'file_upload')),
    external_url TEXT,
    storage_path TEXT,
    file_name TEXT,
    mime_type TEXT,
    file_size_bytes BIGINT,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    -- Enforce type-specific payload integrity
    CONSTRAINT resources_payload_by_type_check CHECK (
        (
            resource_type = 'external_link'
            AND external_url IS NOT NULL
            AND external_url ~* '^https?://.+'
            AND storage_path IS NULL
        )
        OR (
            resource_type = 'file_upload'
            AND storage_path IS NOT NULL
            AND char_length(trim(storage_path)) > 0
            AND external_url IS NULL
            AND file_size_bytes IS NOT NULL
            AND file_size_bytes > 0
            AND file_size_bytes <= 10485760 -- 10 MB max per student project artifact
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_resources_project_id ON public.resources(project_id);
CREATE INDEX IF NOT EXISTS idx_resources_project_category ON public.resources(project_id, category);
CREATE INDEX IF NOT EXISTS idx_resources_milestone_id ON public.resources(milestone_id);

CREATE TRIGGER set_resources_updated_at
BEFORE UPDATE ON public.resources
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 2. Cross-project and storage path boundary trigger
CREATE OR REPLACE FUNCTION public.check_resource_integrity()
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
            RAISE EXCEPTION 'Linked milestone must belong to the same project as the resource';
        END IF;
    END IF;

    IF NEW.resource_type = 'file_upload' THEN
        -- Enforce that storage_path is scoped under `<project_id>/...` and contains no path traversal
        IF position('..' in NEW.storage_path) > 0 OR NOT (NEW.storage_path LIKE (NEW.project_id::text || '/%')) THEN
            RAISE EXCEPTION 'Storage path must be scoped to the resource project_id without path traversal';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_resource_integrity
BEFORE INSERT OR UPDATE ON public.resources
FOR EACH ROW
EXECUTE FUNCTION public.check_resource_integrity();

-- 3. Enable Row Level Security (RLS) on resources
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- SELECT: Project members can view project resources
CREATE POLICY "Project members can view project resources"
ON public.resources
FOR SELECT
TO authenticated
USING (public.is_project_member(project_id));

-- INSERT: Project members can create project resources
CREATE POLICY "Project members can create project resources"
ON public.resources
FOR INSERT
TO authenticated
WITH CHECK (public.is_project_member(project_id) AND auth.uid() = created_by);

-- UPDATE: Project members can update project resources
CREATE POLICY "Project members can update project resources"
ON public.resources
FOR UPDATE
TO authenticated
USING (public.is_project_member(project_id))
WITH CHECK (public.is_project_member(project_id));

-- DELETE: Project admins/owners or resource creator can delete resources
CREATE POLICY "Admins owners or creators can delete project resources"
ON public.resources
FOR DELETE
TO authenticated
USING (
    public.is_project_admin_or_owner(project_id)
    OR created_by = auth.uid()
);

-- 4. Provision Private Storage Bucket (`project-resources`) & Membership RLS Policies
-- Architecture invariant: "Storage paths are not authorization by themselves."
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'project-resources',
    'project-resources',
    false,
    10485760, -- 10 MB limit
    ARRAY[
        'application/pdf',
        'text/plain',
        'text/csv',
        'text/markdown',
        'application/json',
        'application/zip',
        'image/png',
        'image/jpeg',
        'image/webp',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ]
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Helper function to safely extract the project UUID prefix from storage object name (`<project_id>/<file>`)
CREATE OR REPLACE FUNCTION public.storage_object_project_id(object_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_prefix TEXT;
BEGIN
    v_prefix := split_part(object_name, '/', 1);
    IF v_prefix ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        RETURN v_prefix::UUID;
    END IF;
    RETURN NULL;
END;
$$;

-- Storage SELECT / Download Policy: Only active members of the project may list or download objects
CREATE POLICY "Project members can read private project storage objects"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'project-resources'
    AND public.storage_object_project_id(name) IS NOT NULL
    AND public.is_project_member(public.storage_object_project_id(name))
);

-- Storage INSERT / Upload Policy: Only active members of the project may upload into `<project_id>/...`
CREATE POLICY "Project members can upload private project storage objects"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'project-resources'
    AND public.storage_object_project_id(name) IS NOT NULL
    AND public.is_project_member(public.storage_object_project_id(name))
);

-- Storage DELETE Policy: Project admins/owners or the uploader (`owner = auth.uid()`) may delete objects
CREATE POLICY "Admins owners or uploaders can delete private project storage objects"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'project-resources'
    AND public.storage_object_project_id(name) IS NOT NULL
    AND (
        public.is_project_admin_or_owner(public.storage_object_project_id(name))
        OR owner = auth.uid()
    )
);

