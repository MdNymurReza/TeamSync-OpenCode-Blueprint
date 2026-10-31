-- ==============================================================================
-- MelBond - Phase 2 Initial Schema: Profiles & Row Level Security (RLS)
-- ==============================================================================

-- 1. Create profiles table linked to Supabase auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    university TEXT,
    department TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Comment on table and columns
COMMENT ON TABLE public.profiles IS 'User profiles extending Supabase auth.users with student details.';
COMMENT ON COLUMN public.profiles.id IS 'Primary key referencing auth.users.id.';
COMMENT ON COLUMN public.profiles.email IS 'Email address synchronized from auth.users.';
COMMENT ON COLUMN public.profiles.full_name IS 'Student display name.';
COMMENT ON COLUMN public.profiles.university IS 'University or educational institution name.';
COMMENT ON COLUMN public.profiles.department IS 'Academic department, major, or faculty.';

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Define RLS Policies
-- SELECT: Authenticated users can read profiles for collaboration in projects
CREATE POLICY "Authenticated users can view profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (true);

-- INSERT: A user can only insert their own profile row
CREATE POLICY "Users can insert their own profile"
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- UPDATE: A user can only update their own profile row
CREATE POLICY "Users can update their own profile"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- DELETE: A user can only delete their own profile row
CREATE POLICY "Users can delete their own profile"
    ON public.profiles
    FOR DELETE
    TO authenticated
    USING (auth.uid() = id);

-- 4. Function & Trigger: Automatic profile creation on auth.users sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, university, department)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, 'User'), '@', 1)),
        NEW.raw_user_meta_data->>'university',
        NEW.raw_user_meta_data->>'department'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Function & Trigger: Maintain updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profiles_updated ON public.profiles;
CREATE TRIGGER on_profiles_updated
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
