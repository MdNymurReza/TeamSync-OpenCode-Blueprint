import fs from 'fs';
import path from 'path';

describe('Phase 4 Database Migrations', () => {
  const migrationPath = path.resolve(
    __dirname,
    '../../../supabase/migrations/20261030020000_playbooks_and_phases.sql'
  );

  it('exists and can be read', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  const sql = fs.readFileSync(migrationPath, 'utf8');

  it('creates project_phases table with project isolation and ordering', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.project_phases');
    expect(sql).toContain('REFERENCES public.projects(id) ON DELETE CASCADE');
    expect(sql).toContain('sequence_order INTEGER NOT NULL DEFAULT 0');
    expect(sql).toContain('is_completed BOOLEAN NOT NULL DEFAULT false');
  });

  it('enables Row Level Security on project_phases', () => {
    expect(sql).toContain('ALTER TABLE public.project_phases ENABLE ROW LEVEL SECURITY;');
  });

  it('implements member read and admin/owner mutation RLS policies', () => {
    expect(sql).toContain('CREATE POLICY "Project members can view project phases"');
    expect(sql).toContain('public.is_project_member(project_id)');
    expect(sql).toContain('CREATE POLICY "Project admins and owners can insert phases"');
    expect(sql).toContain('CREATE POLICY "Project admins and owners can update phases"');
    expect(sql).toContain('CREATE POLICY "Project admins and owners can delete phases"');
    expect(sql).toContain('public.is_project_admin_or_owner(project_id)');
  });

  it('implements seed_project_phases with starter templates', () => {
    expect(sql).toContain('FUNCTION public.seed_project_phases');
    expect(sql).toContain("'course_assignment'");
    expect(sql).toContain("'software_project'");
    expect(sql).toContain("'research'");
    expect(sql).toContain("'fyp_capstone'");
  });

  it('implements atomic reorder_project_phases RPC with security boundary check', () => {
    expect(sql).toContain('FUNCTION public.reorder_project_phases');
    expect(sql).toContain('public.is_project_admin_or_owner(p_project_id)');
    expect(sql).toContain('One or more phase IDs do not belong to this project');
  });

  it('updates create_project_with_owner to automatically seed playbook phases', () => {
    expect(sql).toContain('FUNCTION public.create_project_with_owner');
    expect(sql).toContain('public.seed_project_phases(v_project_id, p_project_type)');
  });
});
