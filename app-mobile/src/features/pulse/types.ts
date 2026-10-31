import type { Profile, TeamPulseCheckin, TeamPulseStatus } from '@/types/database';

export interface TeamPulseCheckinWithProfile extends TeamPulseCheckin {
  user?: Profile | null;
}

export interface UpsertTeamPulseInput {
  status: TeamPulseStatus;
  blocker_details?: string | null;
  follow_up_note?: string | null;
  week_start_date?: string;
}

export const TEAM_PULSE_STATUS_OPTIONS: {
  status: TeamPulseStatus;
  label: string;
  description: string;
  badgeVariant: 'success' | 'warning' | 'danger';
  icon: string;
}[] = [
  {
    status: 'on_track',
    label: 'On Track',
    description: 'Progressing smoothly on current deliverables',
    badgeVariant: 'success',
    icon: 'checkmark-circle-outline',
  },
  {
    status: 'needs_support',
    label: 'Needs Support',
    description: 'Could use a pair review, clarification, or extra hand',
    badgeVariant: 'warning',
    icon: 'hand-left-outline',
  },
  {
    status: 'blocked',
    label: 'Blocked',
    description: 'Waiting on a dependency, decision, or external blocker',
    badgeVariant: 'danger',
    icon: 'alert-circle-outline',
  },
];

export type { TeamPulseCheckin, TeamPulseStatus };

