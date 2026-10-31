import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import ProjectMeetingsScreen from '@/../app/projects/[id]/meetings/index';
import { projectsService } from '@/features/projects';
import { playbooksService } from '@/features/playbooks';
import { meetingsService } from '@/features/meetings';

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
    fetchProjectMembers: jest.fn(),
  },
}));

jest.mock('@/features/playbooks', () => ({
  playbooksService: {
    getProjectPhases: jest.fn(),
  },
}));

jest.mock('@/features/meetings', () => {
  const actual = jest.requireActual('@/features/meetings');
  return {
    ...actual,
    meetingsService: {
      fetchProjectMeetings: jest.fn(),
      createMeeting: jest.fn(),
      updateMeeting: jest.fn(),
      deleteMeeting: jest.fn(),
      addActionItem: jest.fn(),
      updateActionItem: jest.fn(),
      convertActionItemToTask: jest.fn(),
    },
  };
});

describe('ProjectMeetingsScreen', () => {
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

  const mockMeetings = [
    {
      id: 'mtg-1',
      project_id: 'proj-1',
      phase_id: null,
      title: 'Sprint 2 Architecture Sync',
      agenda: 'Review RLS schema & storage policies',
      location_or_link: 'Room 402 / Google Meet',
      starts_at: '2026-11-15T14:30:00.000Z',
      ends_at: null,
      status: 'scheduled' as const,
      minutes_summary: 'Agreed to enforce RLS on all tables.',
      attendee_ids: ['user-1'],
      created_by: 'user-1',
      created_at: '2026-10-31T00:00:00Z',
      updated_at: '2026-10-31T00:00:00Z',
      action_items: [
        {
          id: 'ai-1',
          meeting_id: 'mtg-1',
          project_id: 'proj-1',
          title: 'Write Phase 7 migration SQL',
          assignee_id: 'user-1',
          due_date: '2026-11-18T17:00:00.000Z',
          is_completed: false,
          converted_task_id: null,
          created_by: 'user-1',
          created_at: '2026-10-31T00:00:00Z',
          updated_at: '2026-10-31T00:00:00Z',
          assignee: {
            id: 'user-1',
            full_name: 'Student One',
            email: 'student@uni.edu',
            avatar_url: null,
            university: null,
            department: null,
            created_at: '2026-10-01T00:00:00Z',
            updated_at: '2026-10-01T00:00:00Z',
          },
          converted_task: null,
        },
      ],
      action_items_total: 1,
      action_items_completed: 0,
      isPast: false,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (projectsService.fetchProjectDetails as jest.Mock).mockResolvedValue({
      data: mockProject,
      error: null,
    });
    (projectsService.fetchProjectMembers as jest.Mock).mockResolvedValue({
      data: [],
      error: null,
    });
    (playbooksService.getProjectPhases as jest.Mock).mockResolvedValue({
      data: [],
      error: null,
    });
    (meetingsService.fetchProjectMeetings as jest.Mock).mockResolvedValue({
      data: mockMeetings,
      error: null,
    });
  });

  it('renders meetings summary, meeting card, minutes, and action items', async () => {
    await render(<ProjectMeetingsScreen />);

    expect(
      await screen.findByRole('header', { name: 'Meetings & Minutes' })
    ).toBeTruthy();
    expect(screen.getByText('Sprint 2 Architecture Sync')).toBeTruthy();
    expect(screen.getByText('2026-11-15 • 14:30 UTC')).toBeTruthy();
    expect(screen.getByText('Agreed to enforce RLS on all tables.')).toBeTruthy();
    expect(screen.getByText('Write Phase 7 migration SQL')).toBeTruthy();
  });

  it('converts an action item into a task when Convert to Task is pressed', async () => {
    (meetingsService.convertActionItemToTask as jest.Mock).mockResolvedValue({
      data: { taskId: 'task-99', alreadyConverted: false },
      error: null,
    });

    await render(<ProjectMeetingsScreen />);

    const convertBtn = await screen.findByRole('button', {
      name: 'Convert Write Phase 7 migration SQL to task',
    });
    await fireEvent.press(convertBtn);

    await waitFor(() => {
      expect(meetingsService.convertActionItemToTask).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'ai-1', title: 'Write Phase 7 migration SQL' }),
        'Sprint 2 Architecture Sync',
        null
      );
    });
  });

  it('opens the Schedule Meeting modal and creates a new meeting', async () => {
    (meetingsService.createMeeting as jest.Mock).mockResolvedValue({
      data: { id: 'mtg-new', title: 'Final Demo Rehearsal' },
      error: null,
    });

    await render(<ProjectMeetingsScreen />);

    const scheduleBtn = await screen.findByRole('button', {
      name: 'Schedule new meeting',
    });
    await fireEvent.press(scheduleBtn);

    const titleInput = await screen.findByPlaceholderText(
      'e.g. Sprint 2 Planning & Architecture Sync'
    );
    await fireEvent.changeText(titleInput, 'Final Demo Rehearsal');

    const dateInput = screen.getByPlaceholderText('2026-11-15');
    await fireEvent.changeText(dateInput, '2026-11-25');

    const timeInput = screen.getByPlaceholderText('14:30');
    await fireEvent.changeText(timeInput, '16:00');

    await fireEvent.press(screen.getByRole('button', { name: 'Schedule Meeting' }));

    await waitFor(() => {
      expect(meetingsService.createMeeting).toHaveBeenCalledWith(
        'proj-1',
        expect.objectContaining({
          title: 'Final Demo Rehearsal',
          starts_at: '2026-11-25T16:00:00.000Z',
        })
      );
    });
  });
});

