import fs from 'fs';
import path from 'path';

describe('Phase 7 Database Migrations', () => {
  const migrationPath = path.resolve(
    __dirname,
    '../../../supabase/migrations/20261031010000_meetings_and_decisions.sql'
  );

  it('exists and can be read', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  const sql = fs.readFileSync(migrationPath, 'utf8');

  it('creates public.meetings table with TIMESTAMPTZ, status constraints, and time order check', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.meetings');
    expect(sql).toContain('starts_at TIMESTAMPTZ NOT NULL');
    expect(sql).toContain("status IN ('scheduled', 'completed', 'cancelled')");
    expect(sql).toContain('CONSTRAINT meetings_time_order_check CHECK (ends_at IS NULL OR ends_at >= starts_at)');
  });

  it('creates public.meeting_action_items with converted_task_id link for idempotency', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.meeting_action_items');
    expect(sql).toContain(
      'converted_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL'
    );
  });

  it('creates public.decisions table with superseding lineage references', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.decisions');
    expect(sql).toContain("status IN ('proposed', 'accepted', 'rejected', 'superseded')");
    expect(sql).toContain('supersedes_id UUID REFERENCES public.decisions(id) ON DELETE SET NULL');
    expect(sql).toContain('superseded_by_id UUID REFERENCES public.decisions(id) ON DELETE SET NULL');
  });

  it('enforces cross-project integrity and protects accepted decision history from silent overwrite or deletion', () => {
    expect(sql).toContain('FUNCTION public.check_meeting_phase_project');
    expect(sql).toContain('FUNCTION public.check_meeting_action_item_integrity');
    expect(sql).toContain('FUNCTION public.check_decision_integrity');
    expect(sql).toContain('FUNCTION public.protect_decision_history');
    expect(sql).toContain(
      'Accepted or superseded decisions cannot be deleted; supersede them instead to preserve decision history'
    );
    expect(sql).toContain(
      'Accepted decision content is immutable; create a superseding decision to record changes'
    );
  });

  it('provides idempotent convert_action_item_to_task RPC and strict RLS policies', () => {
    expect(sql).toContain('FUNCTION public.convert_action_item_to_task');
    expect(sql).toContain('IF v_item.converted_task_id IS NOT NULL THEN');
    expect(sql).toContain('ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;');
    expect(sql).toContain('ALTER TABLE public.meeting_action_items ENABLE ROW LEVEL SECURITY;');
    expect(sql).toContain('ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;');
    expect(sql).toContain(
      'CREATE POLICY "Admins owners or creators can delete proposed or rejected decisions"'
    );
  });
});

