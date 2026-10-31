import { supabase } from '@/lib/supabase/client';
import type {
  Meeting,
  MeetingActionItem,
  MeetingActionItemUpdate,
  MeetingUpdate,
  Profile,
  ProjectPhase,
  Task,
} from '@/types/database';
import { tasksService } from '@/features/tasks';
import type {
  CreateMeetingActionItemInput,
  CreateMeetingInput,
  MeetingActionItemWithDetails,
  MeetingListFilter,
  MeetingWithDetails,
  UpdateMeetingActionItemInput,
  UpdateMeetingInput,
} from './types';

interface MeetingActionItemRow extends MeetingActionItem {
  assignee?: Profile | null;
  converted_task?: Pick<Task, 'id' | 'title' | 'status'> | null;
}

interface MeetingRowWithRelations extends Meeting {
  phase?: ProjectPhase | null;
  creator?: Profile | null;
  action_items?: MeetingActionItemRow[];
}

/**
 * Parses a date and optional time input into a canonical UTC ISO 8601 string.
 * Supports:
 * - Full ISO strings (`2026-11-15T14:30:00Z` or `2026-11-15T14:30:00+06:00`)
 * - Date + 24h time (`2026-11-15 14:30` or `dateInput='2026-11-15'`, `timeInput='14:30'`)
 * - Date-only (`2026-11-15` -> defaults to `09:00` UTC if no time provided)
 */
export function parseMeetingTimestamp(
  dateInput: string,
  timeInput?: string | null
): { iso: string | null; error: string | null } {
  const trimmedDate = dateInput.trim();
  if (!trimmedDate) {
    return { iso: null, error: 'Meeting date is required (YYYY-MM-DD)' };
  }

  // If full ISO timestamp passed directly
  if (trimmedDate.includes('T')) {
    const parsed = new Date(trimmedDate);
    if (isNaN(parsed.getTime())) {
      return { iso: null, error: 'Invalid ISO date/time format' };
    }
    return { iso: parsed.toISOString(), error: null };
  }

  // Split "YYYY-MM-DD HH:mm" if combined in dateInput
  let datePart = trimmedDate;
  let timePart = timeInput?.trim() || '';
  if (trimmedDate.includes(' ') && !timePart) {
    const parts = trimmedDate.split(/\s+/);
    datePart = parts[0] ?? '';
    timePart = parts[1] ?? '';
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return { iso: null, error: 'Use YYYY-MM-DD format (e.g. 2026-11-15)' };
  }

  const normalizedTime = timePart || '09:00';
  if (!/^\d{2}:\d{2}$/.test(normalizedTime)) {
    return { iso: null, error: 'Use 24-hour HH:MM format (e.g. 14:30)' };
  }

  const [hoursStr, minutesStr] = normalizedTime.split(':');
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return { iso: null, error: 'Time must be between 00:00 and 23:59' };
  }

  const candidate = new Date(`${datePart}T${normalizedTime}:00.000Z`);
  if (isNaN(candidate.getTime()) || !candidate.toISOString().startsWith(datePart)) {
    return { iso: null, error: 'Invalid calendar date' };
  }

  return { iso: candidate.toISOString(), error: null };
}

/**
 * Validates that meeting end time is not earlier than start time.
 */
export function validateMeetingTimeRange(
  startsAtIso: string,
  endsAtIso?: string | null
): { valid: boolean; error: string | null } {
  const startMs = new Date(startsAtIso).getTime();
  if (isNaN(startMs)) {
    return { valid: false, error: 'Invalid meeting start time' };
  }

  if (!endsAtIso) {
    return { valid: true, error: null };
  }

  const endMs = new Date(endsAtIso).getTime();
  if (isNaN(endMs)) {
    return { valid: false, error: 'Invalid meeting end time' };
  }

  if (endMs < startMs) {
    return { valid: false, error: 'Meeting end time cannot be earlier than start time' };
  }

  return { valid: true, error: null };
}

/**
 * Formats an ISO timestamp into a deterministic UTC or local readable label.
 */
export function formatMeetingDateTime(isoString: string): string {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) {
    return 'Invalid date';
  }
  const datePart = d.toISOString().slice(0, 10);
  const timePart = d.toISOString().slice(11, 16);
  return `${datePart} • ${timePart} UTC`;
}

function enrichMeetingRow(
  row: MeetingRowWithRelations,
  nowIso: string = new Date().toISOString()
): MeetingWithDetails {
  const actionItems = (row.action_items ?? []) as MeetingActionItemWithDetails[];
  const action_items_total = actionItems.length;
  const action_items_completed = actionItems.filter(
    (item) => item.is_completed || item.converted_task?.status === 'done'
  ).length;
  const isPast = row.starts_at < nowIso || row.status === 'completed';

  return {
    ...row,
    attendee_ids: Array.isArray(row.attendee_ids) ? row.attendee_ids : [],
    action_items: actionItems,
    action_items_total,
    action_items_completed,
    isPast,
  };
}

export const meetingsService = {
  /**
   * Fetches all meetings for a project with action items, phase, and creator info.
   */
  async fetchProjectMeetings(
    projectId: string,
    filter: MeetingListFilter = 'all',
    nowIso: string = new Date().toISOString()
  ): Promise<{ data: MeetingWithDetails[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('meetings')
        .select(
          `
          *,
          phase:project_phases!meetings_phase_id_fkey(*),
          creator:profiles!meetings_created_by_fkey(*),
          action_items:meeting_action_items(
            *,
            assignee:profiles!meeting_action_items_assignee_id_fkey(*),
            converted_task:tasks!meeting_action_items_converted_task_id_fkey(id, title, status)
          )
        `
        )
        .eq('project_id', projectId)
        .order('starts_at', { ascending: true });

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      const rows = (data || []) as unknown as MeetingRowWithRelations[];
      const enriched = rows.map((r) => enrichMeetingRow(r, nowIso));

      if (filter === 'upcoming') {
        return {
          data: enriched.filter((m) => m.status === 'scheduled' && m.starts_at >= nowIso),
          error: null,
        };
      }
      if (filter === 'completed') {
        return {
          data: enriched.filter(
            (m) => m.status === 'completed' || (m.status === 'scheduled' && m.starts_at < nowIso)
          ),
          error: null,
        };
      }
      if (filter === 'cancelled') {
        return {
          data: enriched.filter((m) => m.status === 'cancelled'),
          error: null,
        };
      }

      return { data: enriched, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch meetings';
      return { data: null, error: new Error(message) };
    }
  },

  /**
   * Fetches a single meeting with its action items and relations.
   */
  async fetchMeetingDetails(
    meetingId: string,
    nowIso: string = new Date().toISOString()
  ): Promise<{ data: MeetingWithDetails | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('meetings')
        .select(
          `
          *,
          phase:project_phases!meetings_phase_id_fkey(*),
          creator:profiles!meetings_created_by_fkey(*),
          action_items:meeting_action_items(
            *,
            assignee:profiles!meeting_action_items_assignee_id_fkey(*),
            converted_task:tasks!meeting_action_items_converted_task_id_fkey(id, title, status)
          )
        `
        )
        .eq('id', meetingId)
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      const row = data as unknown as MeetingRowWithRelations;
      return { data: enrichMeetingRow(row, nowIso), error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch meeting details';
      return { data: null, error: new Error(message) };
    }
  },

  /**
   * Schedules a new meeting in a project.
   */
  async createMeeting(
    projectId: string,
    input: CreateMeetingInput
  ): Promise<{ data: MeetingWithDetails | null; error: Error | null }> {
    try {
      const trimmedTitle = input.title.trim();
      if (!trimmedTitle) {
        return { data: null, error: new Error('Meeting title is required') };
      }

      const rangeCheck = validateMeetingTimeRange(input.starts_at, input.ends_at);
      if (!rangeCheck.valid) {
        return { data: null, error: new Error(rangeCheck.error ?? 'Invalid meeting time range') };
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { data: null, error: new Error('You must be signed in to schedule a meeting') };
      }

      const uniqueAttendees = Array.from(new Set(input.attendee_ids ?? []));

      const { data, error } = await supabase
        .from('meetings')
        .insert({
          project_id: projectId,
          title: trimmedTitle,
          starts_at: input.starts_at,
          ends_at: input.ends_at || null,
          agenda: input.agenda?.trim() || null,
          location_or_link: input.location_or_link?.trim() || null,
          phase_id: input.phase_id || null,
          attendee_ids: uniqueAttendees,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      const row = data as unknown as MeetingRowWithRelations;
      return { data: enrichMeetingRow(row), error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create meeting';
      return { data: null, error: new Error(message) };
    }
  },

  /**
   * Updates an existing meeting (agenda, status, minutes_summary, optional attendance).
   */
  async updateMeeting(
    meetingId: string,
    input: UpdateMeetingInput
  ): Promise<{ data: Meeting | null; error: Error | null }> {
    try {
      if (input.starts_at && input.ends_at !== undefined) {
        const rangeCheck = validateMeetingTimeRange(input.starts_at, input.ends_at);
        if (!rangeCheck.valid) {
          return { data: null, error: new Error(rangeCheck.error ?? 'Invalid meeting time range') };
        }
      }

      const updates: MeetingUpdate = {};
      if (input.title !== undefined) updates.title = input.title.trim();
      if (input.starts_at !== undefined) updates.starts_at = input.starts_at;
      if (input.ends_at !== undefined) updates.ends_at = input.ends_at;
      if (input.agenda !== undefined) updates.agenda = input.agenda?.trim() || null;
      if (input.location_or_link !== undefined) {
        updates.location_or_link = input.location_or_link?.trim() || null;
      }
      if (input.phase_id !== undefined) updates.phase_id = input.phase_id;
      if (input.status !== undefined) updates.status = input.status;
      if (input.minutes_summary !== undefined) {
        updates.minutes_summary = input.minutes_summary?.trim() || null;
      }
      if (input.attendee_ids !== undefined) {
        updates.attendee_ids = Array.from(new Set(input.attendee_ids));
      }

      const { data, error } = await supabase
        .from('meetings')
        .update(updates)
        .eq('id', meetingId)
        .select()
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as Meeting, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update meeting';
      return { data: null, error: new Error(message) };
    }
  },

  /**
   * Deletes a meeting.
   */
  async deleteMeeting(meetingId: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.from('meetings').delete().eq('id', meetingId);
      if (error) {
        return { error: new Error(error.message) };
      }
      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete meeting';
      return { error: new Error(message) };
    }
  },

  // --------------------------------------------------------------------------
  // Action Items & Idempotent Task Conversion
  // --------------------------------------------------------------------------

  async addActionItem(
    meetingId: string,
    projectId: string,
    input: CreateMeetingActionItemInput
  ): Promise<{ data: MeetingActionItemWithDetails | null; error: Error | null }> {
    try {
      const trimmedTitle = input.title.trim();
      if (!trimmedTitle) {
        return { data: null, error: new Error('Action item title is required') };
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { data: null, error: new Error('You must be signed in to add an action item') };
      }

      const { data, error } = await supabase
        .from('meeting_action_items')
        .insert({
          meeting_id: meetingId,
          project_id: projectId,
          title: trimmedTitle,
          assignee_id: input.assignee_id || null,
          due_date: input.due_date || null,
          created_by: user.id,
        })
        .select(
          `
          *,
          assignee:profiles!meeting_action_items_assignee_id_fkey(*),
          converted_task:tasks!meeting_action_items_converted_task_id_fkey(id, title, status)
        `
        )
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as unknown as MeetingActionItemWithDetails, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add action item';
      return { data: null, error: new Error(message) };
    }
  },

  async updateActionItem(
    actionItemId: string,
    input: UpdateMeetingActionItemInput
  ): Promise<{ data: MeetingActionItem | null; error: Error | null }> {
    try {
      const updates: MeetingActionItemUpdate = {};
      if (input.title !== undefined) updates.title = input.title.trim();
      if (input.assignee_id !== undefined) updates.assignee_id = input.assignee_id;
      if (input.due_date !== undefined) updates.due_date = input.due_date;
      if (input.is_completed !== undefined) updates.is_completed = input.is_completed;
      if (input.converted_task_id !== undefined) {
        updates.converted_task_id = input.converted_task_id;
      }

      const { data, error } = await supabase
        .from('meeting_action_items')
        .update(updates)
        .eq('id', actionItemId)
        .select()
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as MeetingActionItem, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update action item';
      return { data: null, error: new Error(message) };
    }
  },

  async deleteActionItem(actionItemId: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase
        .from('meeting_action_items')
        .delete()
        .eq('id', actionItemId);
      if (error) {
        return { error: new Error(error.message) };
      }
      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete action item';
      return { error: new Error(message) };
    }
  },

  /**
   * Idempotently converts a meeting action item into a project task (PRD FR-06).
   * - If `actionItem.converted_task_id` is already set, returns that task ID immediately
   *   without creating a duplicate task.
   * - Otherwise attempts the atomic PostgreSQL RPC `convert_action_item_to_task`.
   * - Falls back to client-side task creation + `converted_task_id` link if RPC is unavailable in mock/test environments.
   */
  async convertActionItemToTask(
    actionItem: Pick<
      MeetingActionItem,
      | 'id'
      | 'project_id'
      | 'meeting_id'
      | 'title'
      | 'assignee_id'
      | 'due_date'
      | 'converted_task_id'
    >,
    meetingTitle?: string,
    phaseId?: string | null
  ): Promise<{
    data: { taskId: string; alreadyConverted: boolean } | null;
    error: Error | null;
  }> {
    try {
      // 1. Fast-path idempotency check on already-loaded action item
      if (actionItem.converted_task_id) {
        return {
          data: { taskId: actionItem.converted_task_id, alreadyConverted: true },
          error: null,
        };
      }

      // 2. Check latest DB state in case another teammate converted it concurrently
      const { data: latestRow } = await supabase
        .from('meeting_action_items')
        .select('converted_task_id')
        .eq('id', actionItem.id)
        .single();

      const existingTaskId = (latestRow as { converted_task_id?: string | null } | null)
        ?.converted_task_id;
      if (existingTaskId) {
        return {
          data: { taskId: existingTaskId, alreadyConverted: true },
          error: null,
        };
      }

      // 3. Try atomic server-side RPC first
      if (typeof supabase.rpc === 'function') {
        const { data: rpcTaskId, error: rpcError } = await supabase.rpc(
          'convert_action_item_to_task',
          {
            p_action_item_id: actionItem.id,
          }
        );

        if (!rpcError && rpcTaskId) {
          return {
            data: { taskId: String(rpcTaskId), alreadyConverted: false },
            error: null,
          };
        }
      }

      // 4. Fallback: create task via tasksService and link converted_task_id
      const { data: createdTask, error: createError } = await tasksService.createTask(
        actionItem.project_id,
        {
          title: actionItem.title,
          description: `Created from meeting action item${
            meetingTitle ? `: ${meetingTitle}` : ''
          }`,
          primary_assignee_id: actionItem.assignee_id,
          due_date: actionItem.due_date,
          phase_id: phaseId ?? null,
          priority: 'medium',
        }
      );

      if (createError || !createdTask) {
        return {
          data: null,
          error: createError ?? new Error('Failed to create task from action item'),
        };
      }

      const { error: linkError } = await this.updateActionItem(actionItem.id, {
        converted_task_id: createdTask.id,
      });

      if (linkError) {
        return { data: null, error: linkError };
      }

      return {
        data: { taskId: createdTask.id, alreadyConverted: false },
        error: null,
      };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to convert action item to task';
      return { data: null, error: new Error(message) };
    }
  },
};

