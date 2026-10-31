import fs from 'fs';
import path from 'path';

describe('Phase 3 Database Migrations', () => {
  const migrationPath = path.resolve(
    __dirname,
    '../../../supabase/migrations/20261030010000_projects_and_members.sql'
  );

  it('exists and can be read', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  const sql = fs.readFileSync(migrationPath, 'utf8');

  it('creates projects, project_members, and project_invitations tables', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.projects');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.project_members');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.project_invitations');
  });

  it('enforces check constraints on project types and member roles', () => {
    expect(sql).toContain(
      "project_type IN ('course_assignment', 'software_project', 'research', 'fyp_capstone', 'other')"
    );
    expect(sql).toContain("role IN ('owner', 'admin', 'member')");
  });

  it('enables Row Level Security on all tables', () => {
    expect(sql).toContain('ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;');
    expect(sql).toContain('ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;');
    expect(sql).toContain('ALTER TABLE public.project_invitations ENABLE ROW LEVEL SECURITY;');
  });

  it('implements security helper functions with SECURITY DEFINER and search_path', () => {
    expect(sql).toContain('FUNCTION public.is_project_member');
    expect(sql).toContain('FUNCTION public.get_project_role');
    expect(sql).toContain('FUNCTION public.is_project_admin_or_owner');
    expect(sql).toContain('SET search_path = public');
  });

  it('implements atomic RPCs for project creation, invitation redemption, and leaving', () => {
    expect(sql).toContain('FUNCTION public.create_project_with_owner');
    expect(sql).toContain('FUNCTION public.redeem_invitation');
    expect(sql).toContain('FUNCTION public.leave_project');
  });

  it('enforces the owner invariant in leave_project', () => {
    expect(sql).toContain('Cannot leave project: you are the sole owner');
  });
});
