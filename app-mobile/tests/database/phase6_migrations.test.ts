import fs from 'fs';
import path from 'path';

describe('Phase 6 Database Migrations', () => {
  const migrationPath = path.resolve(
    __dirname,
    '../../../supabase/migrations/20261031000000_milestones_and_timeline.sql'
  );

  it('exists and can be read', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  const sql = fs.readFileSync(migrationPath, 'utf8');

  it('creates public.milestones table with status and progress_mode constraints', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.milestones');
    expect(sql).toContain("status IN ('upcoming', 'in_progress', 'completed')");
    expect(sql).toContain("progress_mode IN ('auto', 'manual')");
    expect(sql).toContain('manual_progress >= 0 AND manual_progress <= 100');
  });

  it('links tasks to milestones with ON DELETE SET NULL so deleting a milestone preserves tasks', () => {
    expect(sql).toContain(
      'ADD COLUMN IF NOT EXISTS milestone_id UUID REFERENCES public.milestones(id) ON DELETE SET NULL'
    );
  });

  it('enforces same-project integrity for milestone phases and task-to-milestone links', () => {
    expect(sql).toContain('FUNCTION public.check_milestone_phase_project');
    expect(sql).toContain('Phase must belong to the same project as the milestone');
    expect(sql).toContain('FUNCTION public.check_task_milestone_project');
    expect(sql).toContain('Milestone must belong to the same project as the task');
  });

  it('enables Row Level Security and defines project membership policies for milestones', () => {
    expect(sql).toContain('ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;');
    expect(sql).toContain('CREATE POLICY "Project members can view project milestones"');
    expect(sql).toContain('CREATE POLICY "Project members can create milestones"');
    expect(sql).toContain('CREATE POLICY "Project members can update milestones"');
    expect(sql).toContain('CREATE POLICY "Admins owners or creators can delete milestones"');
  });
});
