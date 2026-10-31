import { supabase } from '@/lib/supabase/client';
import type { Profile, TeamPulseCheckin } from '@/types/database';
import type { TeamPulseCheckinWithProfile, UpsertTeamPulseInput } from './types';

interface TeamPulseRow extends TeamPulseCheckin {
  user?: Profile | null;
}

/**
 * Computes the canonical Monday `YYYY-MM-DD` week start date in UTC for a given ISO timestamp
 * so weekly Team Pulse check-ins group consistently across timezones.
 */
export function getWeekStartDateIso(nowIso: string = new Date().toISOString()): string {
  const d = new Date(nowIso);
  if (isNaN(d.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  const dayOfWeek = d.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diffToMonday)
  );
  return monday.toISOString().slice(0, 10);
}

/**
 * Summarizes weekly Team Pulse check-ins for support coordination ONLY.
 * Non-negotiable rule (PRD FR-11 & Memory.md):
 * - Self-reports are not verified productivity measures.
 * - Never compute member rankings or individual performance scores.
 */
export function summarizeTeamPulse(checkins: Pick<TeamPulseCheckin, 'status'>[]): {
  totalCheckins: number;
  onTrackCount: number;
  needsSupportCount: number;
  blockedCount: number;
} {
  let onTrackCount = 0;
  let needsSupportCount = 0;
  let blockedCount = 0;

  for (const c of checkins) {
    if (c.status === 'on_track') onTrackCount += 1;
    else if (c.status === 'needs_support') needsSupportCount += 1;
    else if (c.status === 'blocked') blockedCount += 1;
  }

  return {
    totalCheckins: checkins.length,
    onTrackCount,
    needsSupportCount,
    blockedCount,
  };
}

export const pulseService = {
  /**
   * Fetches Team Pulse check-ins for a project (latest week first).
   */
  async fetchProjectPulseCheckins(
    projectId: string,
    weekStartDate?: string
  ): Promise<{ data: TeamPulseCheckinWithProfile[] | null; error: Error | null }> {
    try {
      let query = supabase
        .from('team_pulse_checkins')
        .select(
          `
          *,
          user:profiles!team_pulse_checkins_user_id_fkey(*)
        `
        )
        .eq('project_id', projectId);

      if (weekStartDate) {
        query = query.eq('week_start_date', weekStartDate);
      }

      const { data, error } = await query
        .order('week_start_date', { ascending: false })
        .order('updated_at', { ascending: false });

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      const rows = (data || []) as unknown as TeamPulseRow[];
      return { data: rows, error: null };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch Team Pulse check-ins';
      return { data: null, error: new Error(message) };
    }
  },

  /**
   * Submits or updates the signed-in member's weekly Team Pulse check-in.
   */
  async submitPulseCheckin(
    projectId: string,
    input: UpsertTeamPulseInput
  ): Promise<{ data: TeamPulseCheckinWithProfile | null; error: Error | null }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return {
          data: null,
          error: new Error('You must be signed in to submit a Team Pulse check-in'),
        };
      }

      const weekStart = input.week_start_date || getWeekStartDateIso();

      const { data, error } = await supabase
        .from('team_pulse_checkins')
        .upsert(
          {
            project_id: projectId,
            user_id: user.id,
            week_start_date: weekStart,
            status: input.status,
            blocker_details: input.blocker_details?.trim() || null,
            follow_up_note: input.follow_up_note?.trim() || null,
          },
          { onConflict: 'project_id,user_id,week_start_date' }
        )
        .select(
          `
          *,
          user:profiles!team_pulse_checkins_user_id_fkey(*)
        `
        )
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as unknown as TeamPulseCheckinWithProfile, error: null };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to submit Team Pulse check-in';
      return { data: null, error: new Error(message) };
    }
  },

  /**
   * Updates the follow-up support note on an existing Team Pulse check-in.
   */
  async updatePulseFollowUp(
    checkinId: string,
    followUpNote: string | null
  ): Promise<{ data: TeamPulseCheckin | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('team_pulse_checkins')
        .update({
          follow_up_note: followUpNote?.trim() || null,
        })
        .eq('id', checkinId)
        .select()
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as TeamPulseCheckin, error: null };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to update follow-up note';
      return { data: null, error: new Error(message) };
    }
  },
};

