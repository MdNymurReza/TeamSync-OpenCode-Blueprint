import type {
  ActivityEntityType,
  ActivityEvent,
  ActivityEventType,
  NotificationCategory,
  NotificationDelivery,
  NotificationPreference,
  Profile,
} from '@/types/database';

export interface ActivityEventWithDetails extends ActivityEvent {
  actor?: Profile | null;
  projectName?: string;
}

export interface NotificationDeliveryWithProject extends NotificationDelivery {
  projectName?: string;
}

export interface CreateActivityEventInput {
  project_id: string;
  event_type: ActivityEventType;
  entity_type: ActivityEntityType;
  entity_id: string;
  summary_text: string;
}

export interface DispatchNotificationInput {
  user_id: string;
  project_id: string;
  projectName: string;
  category: NotificationCategory;
  dedupe_key: string;
  title: string;
  sensitiveBody: string;
  genericBody?: string;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: Omit<
  NotificationPreference,
  'user_id' | 'updated_at'
> = {
  task_assignments: true,
  task_updates: true,
  mentions: true,
  deadline_reminders: true,
  meeting_reminders: true,
  team_pulse_reminders: true,
  minimize_lock_screen_content: true,
};

export type {
  ActivityEntityType,
  ActivityEvent,
  ActivityEventType,
  NotificationCategory,
  NotificationDelivery,
  NotificationPreference,
};

