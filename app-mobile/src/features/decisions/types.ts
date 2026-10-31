import type {
  Decision,
  DecisionStatus,
  Meeting,
  Milestone,
  Profile,
  Task,
} from '@/types/database';

export interface DecisionWithDetails extends Decision {
  author?: Profile | null;
  meeting?: Pick<Meeting, 'id' | 'title' | 'starts_at'> | null;
  task?: Pick<Task, 'id' | 'title' | 'status'> | null;
  milestone?: Pick<Milestone, 'id' | 'title'> | null;
  supersedes?: Pick<Decision, 'id' | 'title' | 'status'> | null;
  superseded_by?: Pick<Decision, 'id' | 'title' | 'status'> | null;
}

export type DecisionListFilter = 'all' | 'accepted' | 'proposed' | 'superseded' | 'rejected';

export interface CreateDecisionInput {
  title: string;
  description: string;
  context_reason?: string | null;
  status?: 'proposed' | 'accepted';
  decided_at?: string;
  meeting_id?: string | null;
  task_id?: string | null;
  milestone_id?: string | null;
  supersedes_id?: string | null;
}

export interface SupersedeDecisionInput {
  title: string;
  description: string;
  context_reason?: string | null;
  meeting_id?: string | null;
  task_id?: string | null;
  milestone_id?: string | null;
}

export const DECISION_STATUS_OPTIONS: {
  status: DecisionStatus;
  label: string;
  badgeVariant: 'info' | 'success' | 'warning' | 'danger' | 'default';
}[] = [
  { status: 'proposed', label: 'Proposed', badgeVariant: 'info' },
  { status: 'accepted', label: 'Accepted', badgeVariant: 'success' },
  { status: 'superseded', label: 'Superseded', badgeVariant: 'warning' },
  { status: 'rejected', label: 'Rejected', badgeVariant: 'danger' },
];

export type { Decision, DecisionStatus };

