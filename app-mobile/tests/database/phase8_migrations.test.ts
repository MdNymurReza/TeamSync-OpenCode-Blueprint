import fs from 'fs';
import path from 'path';

describe('Phase 8 Database & Storage Migrations', () => {
  const migrationPath = path.resolve(
    __dirname,
    '../../../supabase/migrations/20261031020000_resources_and_storage.sql'
  );

  it('exists and can be read', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  const sql = fs.readFileSync(migrationPath, 'utf8');

  it('creates public.resources table with category, resource_type, and 10 MB file size constraints', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.resources');
    expect(sql).toContain(
      "category IN ('research', 'datasets', 'design', 'code', 'reports', 'presentations', 'other')"
    );
    expect(sql).toContain("resource_type IN ('external_link', 'file_upload')");
    expect(sql).toContain('file_size_bytes <= 10485760');
  });

  it('enforces cross-project milestone integrity and project-scoped storage_path without path traversal', () => {
    expect(sql).toContain('FUNCTION public.check_resource_integrity');
    expect(sql).toContain(
      'Linked milestone must belong to the same project as the resource'
    );
    expect(sql).toContain(
      'Storage path must be scoped to the resource project_id without path traversal'
    );
  });

  it('enables Row Level Security on public.resources for project members only', () => {
    expect(sql).toContain('ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;');
    expect(sql).toContain('CREATE POLICY "Project members can view project resources"');
    expect(sql).toContain('CREATE POLICY "Project members can create project resources"');
    expect(sql).toContain('CREATE POLICY "Project members can update project resources"');
    expect(sql).toContain(
      'CREATE POLICY "Admins owners or creators can delete project resources"'
    );
  });

  it('provisions private project-resources storage bucket and enforces membership policies on storage.objects', () => {
    expect(sql).toContain("INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)");
    expect(sql).toContain("'project-resources'");
    expect(sql).toContain('false');
    expect(sql).toContain('FUNCTION public.storage_object_project_id');
    expect(sql).toContain(
      'CREATE POLICY "Project members can read private project storage objects"'
    );
    expect(sql).toContain(
      'CREATE POLICY "Project members can upload private project storage objects"'
    );
    expect(sql).toContain(
      'CREATE POLICY "Admins owners or uploaders can delete private project storage objects"'
    );
  });
});

