import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import ProjectMilestonesScreen from '@/../app/projects/[id]/milestones';
import { projectsService } from '@/features/projects';
import { playbooksService } from '@/features/playbooks';
import { tasksService } from '@/features/tasks';
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

jest.mock('@/features/playbooks', () => ({
  playbooksService: {
    getProjectPhases: jest.fn(),
  },
}));

jest.mock('@/features/tasks', () => ({
  tasksService: {
    fetchProjectTasks: jest.fn(),
  },
}));

jest.mock('@/features/milestones', () => {
  const actual = jest.requireActual('@/features/milestones');
  return {
    ...actual,
    milestonesService: {
      fetchProjectMilestones: jest.fn(),
      createMilestone: jest.fn(),
      updateMilestone: jest.fn(),
      deleteMilestone: jest.fn(),
      linkTaskToMilestone: jest.fn(),
    },
  };
});

describe('ProjectMilestonesScreen', () => {
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

  const mockMilestones = [
    {
      id: 'ms-1',
      project_id: 'proj-1',
      phase_id: 'phase-1',
      title: 'Prototype CAD Freeze',
      description: 'Complete chassis CAD & BOM',
      target_date: '2026-11-15T00:00:00.000Z',
      status: 'in_progress' as const,
      progress_mode: 'auto' as const,
      manual_progress: 0,
      sequence_order: 0,
      created_by: 'user-1',
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
      phase: {
        id: 'phase-1',
        project_id: 'proj-1',
        name: 'Design',
        description: null,
        sequence_order: 0,
        is_completed: false,
        created_at: '2026-10-01T00:00:00Z',
        updated_at: '2026-10-01T00:00:00Z',
      },
      linkedTasks: [],
      totalTasks: 4,
      completedTasks: 2,
      progressPercent: 50,
      effectiveStatus: 'in_progress' as const,
      isOverdue: false,
      hasDeadlineRisk: true,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (projectsService.fetchProjectDetails as jest.Mock).mockResolvedValue({
      data: mockProject,
      error: null,
    });
    (playbooksService.getProjectPhases as jest.Mock).mockResolvedValue({
      data: [],
      error: null,
    });
    (tasksService.fetchProjectTasks as jest.Mock).mockResolvedValue({
      data: [],
      error: null,
    });
    (milestonesService.fetchProjectMilestones as jest.Mock).mockResolvedValue({
      data: mockMilestones,
      error: null,
    });
  });

  it('renders milestones timeline summary, milestone card, progress percentage, and deadline risk badge', async () => {
    await render(<ProjectMilestonesScreen />);

    expect(await screen.findByRole('header', { name: 'Milestones & Timeline' })).toBeTruthy();
    expect(screen.getByText('Prototype CAD Freeze')).toBeTruthy();
    expect(screen.getByText('Complete chassis CAD & BOM')).toBeTruthy();
    expect(screen.getByText('Auto from tasks (2/4 done)')).toBeTruthy();
    expect(screen.getByText('50%')).toBeTruthy();
    expect(screen.getByText('Deadline Risk')).toBeTruthy();
  });

  it('opens the New Milestone modal and submits a new milestone', async () => {
    (milestonesService.createMilestone as jest.Mock).mockResolvedValue({
      data: { id: 'ms-new', title: 'Final Presentation' },
      error: null,
    });

    await render(<ProjectMilestonesScreen />);

    const addBtn = await screen.findByRole('button', { name: 'Add Milestone' });
    await fireEvent.press(addBtn);

    expect(await screen.findByText('New Milestone')).toBeTruthy();

    const titleInput = screen.getByPlaceholderText('e.g. Architecture & Schema Sign-off');
    await fireEvent.changeText(titleInput, 'Final Presentation');

    await fireEvent.press(screen.getByRole('button', { name: 'Create Milestone' }));

    await waitFor(() => {
      expect(milestonesService.createMilestone).toHaveBeenCalledWith(
        'proj-1',
        expect.objectContaining({
          title: 'Final Presentation',
          progress_mode: 'auto',
        })
      );
    });
  });

  it('renders empty state when project has no milestones', async () => {
    (milestonesService.fetchProjectMilestones as jest.Mock).mockResolvedValueOnce({
      data: [],
      error: null,
    });

    await render(<ProjectMilestonesScreen />);

    expect(await screen.findByText('No milestones found')).toBeTruthy();
  });
});
