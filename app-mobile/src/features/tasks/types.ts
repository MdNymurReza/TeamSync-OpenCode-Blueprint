import type {
  Profile,
  ProjectPhase,
  Task,
  TaskChecklistItem,
  TaskComment,
  TaskPriority,
  TaskStatus,
} from '../../types/database';

export interface TaskWithDetails extends Task {
  primary_assignee?: Profile | null;
  phase?: ProjectPhase | null;
  collaborators?: Profile[];
  checklist_total?: number;
  checklist_completed?: number;
  comments_count?: number;
}

export interface TaskCommentWithProfile extends TaskComment {
  author?: Profile | null;
}

export interface TaskFilterOptions {
  status?: TaskStatus;
  priority?: TaskPriority;
  phaseId?: string;
  assigneeId?: string;
  overdueOnly?: boolean;
  isArchived?: boolean;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  primary_assignee_id?: string | null;
  priority?: TaskPriority;
  due_date?: string | null;
  start_date?: string | null;
  phase_id?: string | null;
  collaborator_ids?: string[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  primary_assignee_id?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  start_date?: string | null;
  phase_id?: string | null;
  is_archived?: boolean;
}

export const TASK_STATUS_OPTIONS: {
  status: TaskStatus;
  label: string;
  colorVariant: 'default' | 'primary' | 'warning' | 'success' | 'info';
}[] = [
  { status: 'todo', label: 'To Do', colorVariant: 'default' },
  { status: 'in_progress', label: 'In Progress', colorVariant: 'primary' },
  { status: 'in_review', label: 'In Review', colorVariant: 'info' },
  { status: 'done', label: 'Done', colorVariant: 'success' },
];

export const TASK_PRIORITY_OPTIONS: {
  priority: TaskPriority;
  label: string;
  colorVariant: 'default' | 'info' | 'warning' | 'error';
}[] = [
  { priority: 'low', label: 'Low', colorVariant: 'default' },
  { priority: 'medium', label: 'Medium', colorVariant: 'info' },
  { priority: 'high', label: 'High', colorVariant: 'warning' },
  { priority: 'urgent', label: 'Urgent', colorVariant: 'error' },
];

export type {
  Task,
  TaskChecklistItem,
  TaskComment,
  TaskPriority,
  TaskStatus,
};
