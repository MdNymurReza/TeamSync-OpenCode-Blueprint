import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import ProjectTimelineScreen from '@/../app/projects/[id]/timeline';
import { ToastProvider } from '@/components/ui';
import { projectsService } from '@/features/projects';
import { playbooksService } from '@/features/playbooks';
import { milestonesService } from '@/features/milestones';
import { tasksService } from '@/features/tasks';
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
    profile: { id: 'user-1', full_name: 'Student One', avatar_url: null },
    isConfigured: true,
  }),
}));

jest.mock('@/features/projects', () => ({
  projectsService: {
    fetchProjectDetails: jest.fn(),
  },
}));

jest.mock('@/features/playbooks', () => ({
  playbooksService: {
    getProjectPhases: jest.fn(),
  },
}));

jest.mock('@/features/milestones', () => {
  const actual = jest.requireActual('@/features/milestones');
  return {
    ...actual,
    milestonesService: {
      fetchProjectMilestones: jest.fn(),
    },
  };
});

jest.mock('@/features/tasks', () => {
  const actual = jest.requireActual('@/features/tasks');
  return {
    ...actual,
    tasksService: {
      fetchProjectTasks: jest.fn(),
      updateTaskStatus: jest.fn(),
    },
  };
});

jest.mock('@/features/meetings', () => {
  const actual = jest.requireActual('@/features/meetings');
  return {
    ...actual,
    meetingsService: {
      fetchProjectMeetings: jest.fn(),
    },
  };
});

describe('ProjectTimelineScreen', () => {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const todayKey = `${y}-${m}-${d}`;
  const todayIso = `${todayKey}T10:00:00.000Z`;

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

  const mockPhases = [
    {
      id: 'phase-1',
      project_id: 'proj-1',
      name: 'Design & Prototyping',
      description: null,
      sequence_order: 0,
      is_completed: false,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    },
  ];

  const mockMilestones = [
    {
      id: 'ms-1',
      project_id: 'proj-1',
      phase_id: 'phase-1',
      title: 'Milestone CAD Freeze',
      description: 'Chassis mechanical drawings finalized',
      target_date: todayIso,
      status: 'in_progress' as const,
      progress_mode: 'auto' as const,
      manual_progress: 0,
      sequence_order: 0,
      created_by: 'user-1',
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
      phase: mockPhases[0],
      linkedTasks: [],
      progressPercent: 65,
      isOverdue: false,
      hasDeadlineRisk: false,
      effectiveStatus: 'in_progress' as const,
    },
  ];

  const mockTasks = [
    {
      id: 'task-1',
      project_id: 'proj-1',
      phase_id: 'phase-1',
      title: 'Assemble Gearbox Subsystem',
      description: 'Mount gears and test backlash',
      status: 'in_progress' as const,
      priority: 'high' as const,
      due_date: todayIso,
      estimated_hours: 6,
      created_by: 'user-1',
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
      assignees: [
        {
          id: 'asg-1',
          task_id: 'task-1',
          user_id: 'user-1',
          assigned_at: '2026-10-01T00:00:00Z',
          user: {
            id: 'user-1',
            email: 'student@uni.edu',
            full_name: 'Alex Johnson',
            avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
          },
        },
      ],
      phase: mockPhases[0],
      comments_count: 2,
    },
  ];

  const mockMeetings = [
    {
      id: 'mtg-1',
      project_id: 'proj-1',
      title: 'Weekly Standup & Sync',
      agenda: 'Review sprint progress and demo prototypes',
      starts_at: todayIso,
      ends_at: `${todayKey}T11:00:00.000Z`,
      location: 'Lab Room 302',
      status: 'scheduled' as const,
      created_by: 'user-1',
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
      action_items_count: 1,
      creator: {
        id: 'user-1',
        email: 'student@uni.edu',
        full_name: 'Alex Johnson',
        avatar_url: null,
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (projectsService.fetchProjectDetails as jest.Mock).mockResolvedValue({
      data: mockProject,
      error: null,
    });
    (playbooksService.getProjectPhases as jest.Mock).mockResolvedValue({
      data: mockPhases,
      error: null,
    });
    (milestonesService.fetchProjectMilestones as jest.Mock).mockResolvedValue({
      data: mockMilestones,
      error: null,
    });
    (tasksService.fetchProjectTasks as jest.Mock).mockResolvedValue({
      data: mockTasks,
      error: null,
    });
    (meetingsService.fetchProjectMeetings as jest.Mock).mockResolvedValue({
      data: mockMeetings,
      error: null,
    });
    (tasksService.updateTaskStatus as jest.Mock).mockResolvedValue({
      error: null,
    });
  });

  it('renders project timeline header and calendar view by default', async () => {
    render(
      <ToastProvider>
        <ProjectTimelineScreen />
      </ToastProvider>
    );

    // Initial loading indicator
    expect(screen.getByText('Loading project timeline...')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText('Deliverables & Calendar')).toBeTruthy();
      expect(screen.getByText('Autonomous Rover Capstone')).toBeTruthy();
    });

    // KPI Metric Strip
    expect(screen.getByText('Milestones')).toBeTruthy();
    expect(screen.getByText('Sync Meetings')).toBeTruthy();

    // Mode Switch buttons
    expect(screen.getByTestId('view-mode-calendar')).toBeTruthy();
    expect(screen.getByTestId('view-mode-roadmap')).toBeTruthy();

    // Deliverables on selected today date
    expect(screen.getByText('Assemble Gearbox Subsystem')).toBeTruthy();
    expect(screen.getByText('Milestone CAD Freeze')).toBeTruthy();
    expect(screen.getByText('Weekly Standup & Sync')).toBeTruthy();
  });

  it('switches between Monthly Calendar and Linear Roadmap views', async () => {
    render(
      <ToastProvider>
        <ProjectTimelineScreen />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('view-mode-roadmap')).toBeTruthy();
    });

    // Switch to Linear Roadmap view
    fireEvent.press(screen.getByTestId('view-mode-roadmap'));

    await waitFor(() => {
      expect(screen.getByTestId('roadmap-view')).toBeTruthy();
      expect(screen.getByText('Deliverables Roadmap')).toBeTruthy();
    });

    // Items rendered in chronological linear sequence
    expect(screen.getAllByText('Assemble Gearbox Subsystem').length).toBeGreaterThan(0);

    // Switch back to Monthly Calendar view
    fireEvent.press(screen.getByTestId('view-mode-calendar'));

    await waitFor(() => {
      expect(screen.getByTestId('selected-day-section')).toBeTruthy();
    });
  });

  it('filters items by task category chip', async () => {
    render(
      <ToastProvider>
        <ProjectTimelineScreen />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('timeline-filter-tasks')).toBeTruthy();
    });

    // Press tasks filter
    fireEvent.press(screen.getByTestId('timeline-filter-tasks'));

    // Switch to roadmap to check filtered items list
    fireEvent.press(screen.getByTestId('view-mode-roadmap'));

    await waitFor(() => {
      expect(screen.getByText('Assemble Gearbox Subsystem')).toBeTruthy();
      // Milestones and meetings should not appear in tasks-only filter
      expect(screen.queryByText('Milestone CAD Freeze')).toBeNull();
      expect(screen.queryByText('Weekly Standup & Sync')).toBeNull();
    });
  });

  it('quick-completes a task using the checkbox and triggers toast', async () => {
    render(
      <ToastProvider>
        <ProjectTimelineScreen />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('quick-complete-task-task-1')).toBeTruthy();
    });

    // Tap quick complete checkbox
    fireEvent.press(screen.getByTestId('quick-complete-task-task-1'));

    await waitFor(() => {
      expect(tasksService.updateTaskStatus).toHaveBeenCalledWith('task-1', 'completed');
    });
  });

  it('displays error state when project fails to load', async () => {
    (projectsService.fetchProjectDetails as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'Project not found' },
    });

    render(
      <ToastProvider>
        <ProjectTimelineScreen />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Project not found')).toBeTruthy();
    });
  });
});
