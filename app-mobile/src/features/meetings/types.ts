import type {
  Meeting,
  MeetingActionItem,
  MeetingStatus,
  Profile,
  ProjectPhase,
  Task,
} from '@/types/database';

export interface MeetingActionItemWithDetails extends MeetingActionItem {
  assignee?: Profile | null;
  converted_task?: Pick<Task, 'id' | 'title' | 'status'> | null;
}

export interface MeetingWithDetails extends Meeting {
  phase?: ProjectPhase | null;
  creator?: Profile | null;
  action_items: MeetingActionItemWithDetails[];
  action_items_total: number;
  action_items_completed: number;
  isPast: boolean;
}

export type MeetingListFilter = 'all' | 'upcoming' | 'completed' | 'cancelled';

export interface CreateMeetingInput {
  title: string;
  starts_at: string;
  ends_at?: string | null;
  agenda?: string;
  location_or_link?: string;
  phase_id?: string | null;
  attendee_ids?: string[];
}

export interface UpdateMeetingInput {
  title?: string;
  starts_at?: string;
  ends_at?: string | null;
  agenda?: string | null;
  location_or_link?: string | null;
  phase_id?: string | null;
  status?: MeetingStatus;
  minutes_summary?: string | null;
  attendee_ids?: string[];
}

export interface CreateMeetingActionItemInput {
  title: string;
  assignee_id?: string | null;
  due_date?: string | null;
}

export interface UpdateMeetingActionItemInput {
  title?: string;
  assignee_id?: string | null;
  due_date?: string | null;
  is_completed?: boolean;
  converted_task_id?: string | null;
}

export const MEETING_STATUS_OPTIONS: {
  status: MeetingStatus;
  label: string;
  badgeVariant: 'primary' | 'success' | 'default';
}[] = [
  { status: 'scheduled', label: 'Scheduled', badgeVariant: 'primary' },
  { status: 'completed', label: 'Completed', badgeVariant: 'success' },
  { status: 'cancelled', label: 'Cancelled', badgeVariant: 'default' },
];

export type { Meeting, MeetingActionItem, MeetingStatus };

