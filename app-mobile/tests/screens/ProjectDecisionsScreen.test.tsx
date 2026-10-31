import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import ProjectDecisionsScreen from '@/../app/projects/[id]/decisions';
import { projectsService } from '@/features/projects';
import { decisionsService } from '@/features/decisions';
import { meetingsService } from '@/features/meetings';
import { milestonesService } from '@/features/milestones';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'proj-1' }),
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

jest.mock('@/features/auth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'student@uni.edu' },
    profile: { id: 'user-1', full_name: 'Student One' },
    isConfigured: true,
  }),
}));

jest.mock('@/features/projects', () => ({
  projectsService: {
    fetchProjectDetails: jest.fn(),
  },
}));

jest.mock('@/features/meetings', () => ({
  meetingsService: {
    fetchProjectMeetings: jest.fn(),
  },
}));

jest.mock('@/features/milestones', () => ({
  milestonesService: {
    fetchProjectMilestones: jest.fn(),
  },
}));

jest.mock('@/features/decisions', () => {
  const actual = jest.requireActual('@/features/decisions');
  return {
    ...actual,
    decisionsService: {
      fetchProjectDecisions: jest.fn(),
      createDecision: jest.fn(),
      updateDecisionStatus: jest.fn(),
      supersedeDecision: jest.fn(),
      deleteDecision: jest.fn(),
    },
  };
});

describe('ProjectDecisionsScreen', () => {
  const mockProject = {
    id: 'proj-1',
    name: 'Autonomous Rover Capstone',
    description: 'Robotics team workspace',
    course_code: 'ME490',
    semester: 'Fall 2026',
    project_type: 'fyp_capstone' as const,
    target_date: null,
    is_archived: false,
    created_by: 'user-1',
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
    currentUserRole: 'owner' as const,
  };

  const mockDecisions = [
    {
      id: 'dec-1',
      project_id: 'proj-1',
      title: 'Use PostgreSQL RLS for isolation',
      description: 'Every table enables Row Level Security with project membership checks.',
      context_reason: 'Mobile client is untrusted.',
      status: 'accepted' as const,
      decided_at: '2026-10-31T10:00:00.000Z',
      meeting_id: null,
      task_id: null,
      milestone_id: null,
      supersedes_id: null,
      superseded_by_id: null,
      created_by: 'user-1',
      created_at: '2026-10-31T10:00:00.000Z',
      updated_at: '2026-10-31T10:00:00.000Z',
      author: {
        id: 'user-1',
        full_name: 'Student One',
        email: 'student@uni.edu',
        avatar_url: null,
        university: null,
        department: null,
        created_at: '2026-10-01T00:00:00Z',
        updated_at: '2026-10-01T00:00:00Z',
      },
      supersedes: null,
      superseded_by: null,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (projectsService.fetchProjectDetails as jest.Mock).mockResolvedValue({
      data: mockProject,
      error: null,
    });
    (decisionsService.fetchProjectDecisions as jest.Mock).mockResolvedValue({
      data: mockDecisions,
      error: null,
    });
    (meetingsService.fetchProjectMeetings as jest.Mock).mockResolvedValue({
      data: [],
      error: null,
    });
    (milestonesService.fetchProjectMilestones as jest.Mock).mockResolvedValue({
      data: [],
      error: null,
    });
  });

  it('renders decision log header, accepted decision card, rationale, and Supersede action', async () => {
    await render(<ProjectDecisionsScreen />);

    expect(await screen.findByRole('header', { name: 'Decision Log' })).toBeTruthy();
    expect(screen.getByText('Use PostgreSQL RLS for isolation')).toBeTruthy();
    expect(
      screen.getByText(
        'Every table enables Row Level Security with project membership checks.'
      )
    ).toBeTruthy();
    expect(screen.getByText('Mobile client is untrusted.')).toBeTruthy();
    expect(
      screen.getByRole('button', {
        name: 'Supersede decision Use PostgreSQL RLS for isolation',
      })
    ).toBeTruthy();
  });

  it('supersedes an accepted decision while preserving its history', async () => {
    (decisionsService.supersedeDecision as jest.Mock).mockResolvedValue({
      data: {
        newDecision: { id: 'dec-2', title: 'Use PostgreSQL RLS for isolation (Revised)' },
        supersededDecisionId: 'dec-1',
      },
      error: null,
    });

    await render(<ProjectDecisionsScreen />);

    const supersedeBtn = await screen.findByRole('button', {
      name: 'Supersede decision Use PostgreSQL RLS for isolation',
    });
    await fireEvent.press(supersedeBtn);

    const reasonInput = await screen.findByPlaceholderText(
      'Why was this option chosen over alternatives?'
    );
    await fireEvent.changeText(
      reasonInput,
      'Added cross-project trigger validation alongside RLS.'
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Confirm Supersede' }));

    await waitFor(() => {
      expect(decisionsService.supersedeDecision).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'dec-1' }),
        expect.objectContaining({
          title: 'Use PostgreSQL RLS for isolation (Revised)',
          context_reason: 'Added cross-project trigger validation alongside RLS.',
        })
      );
    });
  });

  it('opens the Log Decision modal and records a new decision', async () => {
    (decisionsService.createDecision as jest.Mock).mockResolvedValue({
      data: { id: 'dec-new', title: 'Adopt UTC timestamps' },
      error: null,
    });

    await render(<ProjectDecisionsScreen />);

    const logBtn = await screen.findByRole('button', { name: 'Log new decision' });
    await fireEvent.press(logBtn);

    const titleInput = await screen.findByPlaceholderText(
      'e.g. Use PostgreSQL RLS for multi-tenant isolation'
    );
    await fireEvent.changeText(titleInput, 'Adopt UTC timestamps');

    const descInput = screen.getByPlaceholderText(
      'Clearly state what the team decided...'
    );
    await fireEvent.changeText(
      descInput,
      'Store all meeting and deadline timestamps in UTC TIMESTAMPTZ.'
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Save Decision' }));

    await waitFor(() => {
      expect(decisionsService.createDecision).toHaveBeenCalledWith(
        'proj-1',
        expect.objectContaining({
          title: 'Adopt UTC timestamps',
          description: 'Store all meeting and deadline timestamps in UTC TIMESTAMPTZ.',
          status: 'accepted',
        })
      );
    });
  });
});

