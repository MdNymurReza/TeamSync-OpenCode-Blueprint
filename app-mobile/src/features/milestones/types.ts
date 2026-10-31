import type {
  Milestone,
  MilestoneProgressMode,
  MilestoneStatus,
  ProjectPhase,
  Task,
} from '@/types/database';
import type { TaskWithDetails } from '@/features/tasks';
import type { MeetingWithDetails } from '@/features/meetings';
import type { DecisionWithDetails } from '@/features/decisions';

export type MilestoneEffectiveStatus =
  | 'upcoming'
  | 'in_progress'
  | 'overdue'
  | 'completed';

export interface MilestoneComputedState {
  totalTasks: number;
  completedTasks: number;
  progressPercent: number;
  effectiveStatus: MilestoneEffectiveStatus;
  isOverdue: boolean;
  hasDeadlineRisk: boolean;
}

export interface MilestoneWithDetails extends Milestone, MilestoneComputedState {
  phase?: ProjectPhase | null;
  linkedTasks?: Task[];
}

export type MilestoneTimelineFilter = 'all' | 'upcoming' | 'overdue' | 'completed';

export interface CreateMilestoneInput {
  title: string;
  description?: string;
  target_date?: string | null;
  phase_id?: string | null;
  status?: MilestoneStatus;
  progress_mode?: MilestoneProgressMode;
  manual_progress?: number;
}

export interface UpdateMilestoneInput {
  title?: string;
  description?: string | null;
  target_date?: string | null;
  phase_id?: string | null;
  status?: MilestoneStatus;
  progress_mode?: MilestoneProgressMode;
  manual_progress?: number;
  sequence_order?: number;
}

export interface DashboardTaskItem extends TaskWithDetails {
  projectName: string;
  isOverdue: boolean;
}

export interface DashboardMilestoneItem extends MilestoneWithDetails {
  projectName: string;
}

export interface DashboardMeetingItem extends MeetingWithDetails {
  projectName: string;
}

export interface DashboardDecisionItem extends DecisionWithDetails {
  projectName: string;
}

export interface DashboardSummary {
  activeProjectCount: number;
  totalTasksCount: number;
  completedTasksCount: number;
  overallTaskProgressPercent: number;
  myAssignedTasks: DashboardTaskItem[];
  overdueTasks: DashboardTaskItem[];
  upcomingMilestones: DashboardMilestoneItem[];
  upcomingMeetings: DashboardMeetingItem[];
  recentDecisions: DashboardDecisionItem[];
}

export const MILESTONE_STATUS_OPTIONS: {
  status: MilestoneStatus;
  label: string;
  badgeVariant: 'default' | 'primary' | 'success';
}[] = [
  { status: 'upcoming', label: 'Upcoming', badgeVariant: 'default' },
  { status: 'in_progress', label: 'In Progress', badgeVariant: 'primary' },
  { status: 'completed', label: 'Completed', badgeVariant: 'success' },
];

export type { Milestone, MilestoneProgressMode, MilestoneStatus };

