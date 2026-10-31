import fs from 'node:fs';
import path from 'node:path';

describe('Phase 9 SQL Migration — Activity, Notifications, Team Pulse, Search', () => {
  const migrationPath = path.resolve(
    __dirname,
    '../../../supabase/migrations/20261031030000_activity_notifications_pulse_search.sql'
  );
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  it('defines append-only activity_events with mutation block trigger', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.activity_events');
    expect(sql).toContain('protect_activity_events_immutability');
    expect(sql).toContain(
      'Activity events are append-only and cannot be modified or deleted directly'
    );
    expect(sql).toContain('Project members can view project activity events');
    expect(sql).toContain('Project members can record activity events');
  });

  it('defines notification_preferences with lock-screen privacy toggle and owner-only RLS', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.notification_preferences');
    expect(sql).toContain('minimize_lock_screen_content BOOLEAN NOT NULL DEFAULT true');
    expect(sql).toContain('Users can view their own notification preferences');
    expect(sql).toContain('Users can insert their own notification preferences');
    expect(sql).toContain('Users can update their own notification preferences');
  });

  it('defines notification_deliveries with unique dedupe_key and recipient membership trigger', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.notification_deliveries');
    expect(sql).toContain('UNIQUE (user_id, dedupe_key)');
    expect(sql).toContain('check_notification_recipient_membership');
    expect(sql).toContain('Cannot deliver project notification to a non-member');
  });

  it('defines team_pulse_checkins with weekly uniqueness and member RLS', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.team_pulse_checkins');
    expect(sql).toContain("'on_track', 'needs_support', 'blocked'");
    expect(sql).toContain('UNIQUE (project_id, user_id, week_start_date)');
    expect(sql).toContain('Project members can view team pulse checkins');
    expect(sql).toContain('Project members can submit their own team pulse checkin');
    expect(sql).toContain(
      'Project members can update their own team pulse checkin or follow up'
    );
  });
});
