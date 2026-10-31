import { supabase } from '@/lib/supabase/client';
import type {
  ActivityEvent,
  NotificationCategory,
  NotificationDelivery,
  NotificationPreference,
  NotificationPreferenceUpdate,
  Profile,
} from '@/types/database';
import { projectsService } from '@/features/projects';
import {
  ActivityEventWithDetails,
  CreateActivityEventInput,
  DEFAULT_NOTIFICATION_PREFERENCES,
  DispatchNotificationInput,
  NotificationDeliveryWithProject,
} from './types';

interface ActivityEventRow extends ActivityEvent {
  actor?: Profile | null;
}

/**
 * Pure helper that checks whether a user's `NotificationPreference` allows a given
 * notification category (PRD FR-09).
 */
export function isNotificationCategoryEnabled(
  preferences: Pick<
    NotificationPreference,
    | 'task_assignments'
    | 'task_updates'
    | 'mentions'
    | 'deadline_reminders'
    | 'meeting_reminders'
    | 'team_pulse_reminders'
  >,
  category: NotificationCategory
): boolean {
  switch (category) {
    case 'task_assignment':
      return preferences.task_assignments;
    case 'task_update':
      return preferences.task_updates;
    case 'mention':
      return preferences.mentions;
    case 'deadline_reminder':
      return preferences.deadline_reminders;
    case 'meeting_reminder':
      return preferences.meeting_reminders;
    case 'pulse_reminder':
      return preferences.team_pulse_reminders;
    default:
      return true;
  }
}

/**
 * Builds a deterministic deduplication key (`<category>:<projectId>:<entityId>:<windowKey>`)
 * so scheduled or repeated triggers never spam duplicate reminders for the same event/window.
 */
export function buildNotificationDedupeKey(params: {
  category: NotificationCategory;
  projectId: string;
  entityId: string;
  windowKey?: string;
}): string {
  const { category, projectId, entityId, windowKey = 'once' } = params;
  return `${category}:${projectId.trim()}:${entityId.trim()}:${windowKey.trim()}`;
}

/**
 * Sanitizes notification title and body for lock-screen privacy and authorization safety (PRD FR-09 & NFR Privacy).
 * - Never includes tokens, invite codes, or raw storage paths.
 * - When `minimizeLockScreenContent` is enabled, replaces detailed private task/decision text
 *   with a generic workspace update prompt so sensitive content does not leak on Android lock screens.
 */
export function buildSafeNotificationPayload(params: {
  category: NotificationCategory;
  projectName: string;
  title: string;
  sensitiveBody: string;
  genericBody?: string;
  minimizeLockScreenContent: boolean;
}): { title: string; body: string } {
  const {
    category,
    projectName,
    title,
    sensitiveBody,
    genericBody,
    minimizeLockScreenContent,
  } = params;

  const cleanTitle = title.trim().slice(0, 140) || 'MelBond Update';

  if (minimizeLockScreenContent) {
    const safeGeneric =
      genericBody?.trim() ||
      (category === 'task_assignment'
        ? `You have a new task assignment in ${projectName}. Open MelBond to view details.`
        : category === 'deadline_reminder'
          ? `An upcoming deadline in ${projectName} needs attention.`
          : category === 'meeting_reminder'
            ? `Upcoming team meeting in ${projectName}.`
            : `New team update in ${projectName}. Open MelBond to view.`);

    return {
      title: 'MelBond Workspace Update',
      body: safeGeneric.slice(0, 280),
    };
  }

  return {
    title: cleanTitle,
    body: sensitiveBody.trim().slice(0, 280),
  };
}

/**
 * Evaluates whether a candidate notification should be delivered or suppressed based on:
 * 1. Active membership in the target project (`authorizedProjectIds` — prevents private content leakage to non-members).
 * 2. User's `NotificationPreference` for the category.
 * 3. Existing `deliveredDedupeKeys` set (prevents duplicate reminders).
 */
export function evaluateNotificationCandidate(params: {
  candidate: DispatchNotificationInput;
  authorizedProjectIds: ReadonlySet<string> | readonly string[];
  preferences: Omit<NotificationPreference, 'user_id' | 'updated_at'>;
  deliveredDedupeKeys: ReadonlySet<string> | readonly string[];
}): {
  shouldDeliver: boolean;
  reason: 'ok' | 'unauthorized_project' | 'preference_disabled' | 'duplicate_dedupe_key';
  payload: { title: string; body: string; dedupeKey: string } | null;
} {
  const { candidate, authorizedProjectIds, preferences, deliveredDedupeKeys } = params;

  const projectSet =
    authorizedProjectIds instanceof Set
      ? authorizedProjectIds
      : new Set(authorizedProjectIds);

  if (!projectSet.has(candidate.project_id)) {
    return {
      shouldDeliver: false,
      reason: 'unauthorized_project',
      payload: null,
    };
  }

  if (!isNotificationCategoryEnabled(preferences, candidate.category)) {
    return {
      shouldDeliver: false,
      reason: 'preference_disabled',
      payload: null,
    };
  }

  const dedupeSet =
    deliveredDedupeKeys instanceof Set
      ? deliveredDedupeKeys
      : new Set(deliveredDedupeKeys);

  const normalizedKey = candidate.dedupe_key.trim();
  if (dedupeSet.has(normalizedKey)) {
    return {
      shouldDeliver: false,
      reason: 'duplicate_dedupe_key',
      payload: null,
    };
  }

  const safe = buildSafeNotificationPayload({
    category: candidate.category,
    projectName: candidate.projectName,
    title: candidate.title,
    sensitiveBody: candidate.sensitiveBody,
    genericBody: candidate.genericBody,
    minimizeLockScreenContent: preferences.minimize_lock_screen_content,
  });

  return {
    shouldDeliver: true,
    reason: 'ok',
    payload: {
      title: safe.title,
      body: safe.body,
      dedupeKey: normalizedKey,
    },
  };
}

export const notificationsService = {
  /**
   * Fetches chronological activity events across all active workspaces the user belongs to,
   * or for a single project when `projectId` is provided.
   * Never leaks events from projects the user is not a member of.
   */
  async fetchActivityStream(
    projectId?: string
  ): Promise<{ data: ActivityEventWithDetails[] | null; error: Error | null }> {
    try {
      const { data: userProjects, error: projError } =
        await projectsService.fetchUserProjects();
      if (projError) {
        return { data: null, error: projError };
      }

      const activeProjects = (userProjects ?? []).filter((p) => !p.is_archived);
      const projectMap = new Map(activeProjects.map((p) => [p.id, p.name]));

      if (projectId && !projectMap.has(projectId)) {
        return {
          data: [],
          error: null,
        };
      }

      const targetIds = projectId ? [projectId] : Array.from(projectMap.keys());
      if (targetIds.length === 0) {
        return { data: [], error: null };
      }

      const { data, error } = await supabase
        .from('activity_events')
        .select(
          `
          *,
          actor:profiles!activity_events_actor_id_fkey(*)
        `
        )
        .in('project_id', targetIds)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      const rows = (data || []) as unknown as ActivityEventRow[];
      const enriched: ActivityEventWithDetails[] = rows
        .filter((r) => projectMap.has(r.project_id))
        .map((r) => ({
          ...r,
          projectName: projectMap.get(r.project_id) ?? 'Workspace',
        }));

      return { data: enriched, error: null };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load activity stream';
      return { data: null, error: new Error(message) };
    }
  },

  /**
   * Appends a new chronological activity event to a project's audit stream.
   */
  async recordActivityEvent(
    input: CreateActivityEventInput
  ): Promise<{ data: ActivityEvent | null; error: Error | null }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { data: null, error: new Error('You must be signed in to log activity') };
      }

      const { data, error } = await supabase
        .from('activity_events')
        .insert({
          project_id: input.project_id,
          actor_id: user.id,
          event_type: input.event_type,
          entity_type: input.entity_type,
          entity_id: input.entity_id,
          summary_text: input.summary_text.trim().slice(0, 240),
        })
        .select()
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as ActivityEvent, error: null };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to record activity event';
      return { data: null, error: new Error(message) };
    }
  },

  /**
   * Fetches the signed-in user's notification preferences, falling back to safe defaults
   * (`minimize_lock_screen_content: true`) when no row exists yet.
   */
  async fetchNotificationPreferences(): Promise<{
    data: NotificationPreference | null;
    error: Error | null;
  }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { data: null, error: new Error('Not signed in') };
      }

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      if (!data) {
        return {
          data: {
            user_id: user.id,
            ...DEFAULT_NOTIFICATION_PREFERENCES,
            updated_at: new Date().toISOString(),
          },
          error: null,
        };
      }

      return { data: data as NotificationPreference, error: null };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load notification preferences';
      return { data: null, error: new Error(message) };
    }
  },

  /**
   * Upserts the signed-in user's notification preferences.
   */
  async updateNotificationPreferences(
    updates: NotificationPreferenceUpdate
  ): Promise<{ data: NotificationPreference | null; error: Error | null }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { data: null, error: new Error('Not signed in') };
      }

      const { data, error } = await supabase
        .from('notification_preferences')
        .upsert(
          {
            user_id: user.id,
            ...updates,
          },
          { onConflict: 'user_id' }
        )
        .select()
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as NotificationPreference, error: null };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to update notification preferences';
      return { data: null, error: new Error(message) };
    }
  },

  /**
   * Fetches delivered notifications for the current user across authorized projects.
   */
  async fetchUserNotifications(): Promise<{
    data: NotificationDeliveryWithProject[] | null;
    error: Error | null;
  }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { data: [], error: null };
      }

      const { data: userProjects } = await projectsService.fetchUserProjects();
      const projectMap = new Map((userProjects ?? []).map((p) => [p.id, p.name]));

      const { data, error } = await supabase
        .from('notification_deliveries')
        .select('*')
        .eq('user_id', user.id)
        .order('delivered_at', { ascending: false })
        .limit(40);

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      const rows = (data || []) as NotificationDelivery[];
      const authorizedRows: NotificationDeliveryWithProject[] = rows
        .filter((r) => projectMap.has(r.project_id))
        .map((r) => ({
          ...r,
          projectName: projectMap.get(r.project_id) ?? 'Workspace',
        }));

      return { data: authorizedRows, error: null };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch notifications';
      return { data: null, error: new Error(message) };
    }
  },

  /**
   * Marks a notification delivery as read.
   */
  async markNotificationRead(
    notificationId: string
  ): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase
        .from('notification_deliveries')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        return { error: new Error(error.message) };
      }
      return { error: null };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to mark notification read';
      return { error: new Error(message) };
    }
  },
};

