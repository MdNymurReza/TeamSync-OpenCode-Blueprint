import { getWeekStartDateIso, summarizeTeamPulse } from '@/features/pulse';
import type { TeamPulseCheckin } from '@/features/pulse';

describe('pulseService (Phase 9)', () => {
  it('computes UTC Monday week start date accurately', () => {
    // Saturday 2026-10-31 -> Monday 2026-10-26
    expect(getWeekStartDateIso('2026-10-31T15:00:00.000Z')).toBe('2026-10-26');
    // Sunday 2026-11-01 -> Monday 2026-10-26
    expect(getWeekStartDateIso('2026-11-01T12:00:00.000Z')).toBe('2026-10-26');
    // Monday 2026-11-02 -> Monday 2026-11-02
    expect(getWeekStartDateIso('2026-11-02T00:00:00.000Z')).toBe('2026-11-02');
  });

  it('summarizes weekly check-ins without ranking or scoring members', () => {
    const checkins: TeamPulseCheckin[] = [
      {
        id: 'p-1',
        project_id: 'proj-1',
        user_id: 'u-1',
        week_start_date: '2026-10-26',
        status: 'on_track',
        blocker_details: null,
        follow_up_note: 'Finishing literature review',
        created_at: '2026-10-31T10:00:00.000Z',
        updated_at: '2026-10-31T10:00:00.000Z',
      },
      {
        id: 'p-2',
        project_id: 'proj-1',
        user_id: 'u-2',
        week_start_date: '2026-10-26',
        status: 'needs_support',
        blocker_details: 'Need help debugging RLS migration',
        follow_up_note: 'Pair with backend lead on Monday',
        created_at: '2026-10-31T11:00:00.000Z',
        updated_at: '2026-10-31T11:00:00.000Z',
      },
      {
        id: 'p-3',
        project_id: 'proj-1',
        user_id: 'u-3',
        week_start_date: '2026-10-26',
        status: 'blocked',
        blocker_details: 'Waiting on dataset credentials',
        follow_up_note: null,
        created_at: '2026-10-31T12:00:00.000Z',
        updated_at: '2026-10-31T12:00:00.000Z',
      },
    ];

    const summary = summarizeTeamPulse(checkins);
    expect(summary).toEqual({
      totalCheckins: 3,
      onTrackCount: 1,
      needsSupportCount: 1,
      blockedCount: 1,
    });
  });
});
