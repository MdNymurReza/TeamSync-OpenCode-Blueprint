import fs from 'fs';
import path from 'path';

describe('Phase 5 Database Migrations', () => {
  const migrationPath = path.resolve(
    __dirname,
    '../../../supabase/migrations/20261030030000_task_management.sql'
  );

  it('exists and can be read', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  const sql = fs.readFileSync(migrationPath, 'utf8');

  it('creates tasks, collaborators, checklist_items, and comments tables', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.tasks');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.task_collaborators');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.task_checklist_items');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.task_comments');
  });

  it('enforces check constraints on task status and priority', () => {
    expect(sql).toContain("status IN ('todo', 'in_progress', 'in_review', 'done')");
    expect(sql).toContain("priority IN ('low', 'medium', 'high', 'urgent')");
  });

  it('preserves tasks when phases are deleted (ON DELETE SET NULL)', () => {
    expect(sql).toContain('phase_id UUID REFERENCES public.project_phases(id) ON DELETE SET NULL');
  });

  it('enforces assignee and collaborator project membership invariants', () => {
    expect(sql).toContain('FUNCTION public.check_task_assignee_membership');
    expect(sql).toContain('Primary assignee must be an active member of this project');
    expect(sql).toContain('FUNCTION public.check_task_collaborator_membership');
    expect(sql).toContain('Collaborator must be an active member of the project');
  });

  it('enables Row Level Security on all 4 task tables', () => {
    expect(sql).toContain('ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;');
    expect(sql).toContain('ALTER TABLE public.task_collaborators ENABLE ROW LEVEL SECURITY;');
    expect(sql).toContain('ALTER TABLE public.task_checklist_items ENABLE ROW LEVEL SECURITY;');
    expect(sql).toContain('ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;');
  });

  it('defines explicit project membership RLS policies for viewing and updating', () => {
    expect(sql).toContain('CREATE POLICY "Project members can view project tasks"');
    expect(sql).toContain('CREATE POLICY "Project members can update tasks"');
    expect(sql).toContain('CREATE POLICY "Admins owners or creators can delete tasks"');
  });
});
