import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import ProjectTasksScreen from '@/../app/projects/[id]/tasks/index';
import { playbooksService } from '@/features/playbooks';
import { projectsService } from '@/features/projects';
import { tasksService } from '@/features/tasks';

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

jest.mock('@/features/tasks', () => {
  const actual = jest.requireActual('@/features/tasks');
  return {
    ...actual,
    tasksService: {
      fetchProjectTasks: jest.fn(),
      updateTask: jest.fn(),
    },
  };
});

// Mock expo-router
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'proj-123' }),
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
  }),
}));

describe('ProjectTasksScreen (Phase 5)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockProject = {
    id: 'proj-123',
    name: 'CS50 Mobile Workspace',
    project_type: 'software_project' as const,
    currentUserRole: 'owner' as const,
    is_archived: false,
    created_by: 'owner-id',
    created_at: '2026-10-30T00:00:00Z',
    updated_at: '2026-10-30T00:00:00Z',
    course_code: null,
    department: null,
    description: null,
    semester: null,
    target_date: null,
  };

  const mockTasks = [
    {
      id: 'task-1',
      project_id: 'proj-123',
      title: 'Design Database Schema',
      description: 'Tables for tasks and comments',
      status: 'done' as const,
      priority: 'high' as const,
      due_date: '2026-11-01T00:00:00Z',
      start_date: null,
      phase_id: 'phase-1',
      is_archived: false,
      created_by: 'owner-id',
      updated_by: null,
      created_at: '2026-10-30T00:00:00Z',
      updated_at: '2026-10-30T00:00:00Z',
      primary_assignee: {
        id: 'owner-id',
        full_name: 'Alice Smith',
        email: 'alice@uni.edu',
        avatar_url: null,
        university: null,
        department: null,
        created_at: '2026-10-30T00:00:00Z',
        updated_at: '2026-10-30T00:00:00Z',
      },
      checklist_total: 2,
      checklist_completed: 2,
      comments_count: 3,
    },
    {
      id: 'task-2',
      project_id: 'proj-123',
      title: 'Overdue Bugfix',
      description: 'Fix urgent crash',
      status: 'in_progress' as const,
      priority: 'urgent' as const,
      due_date: '2020-01-01T00:00:00Z', // past due
      start_date: null,
      phase_id: null,
      is_archived: false,
      created_by: 'owner-id',
      updated_by: null,
      created_at: '2026-10-30T00:00:00Z',
      updated_at: '2026-10-30T00:00:00Z',
      primary_assignee: null,
      checklist_total: 0,
      checklist_completed: 0,
      comments_count: 0,
    },
  ];

  it('renders screen header, action button, and task cards with badges', async () => {
    (projectsService.fetchProjectDetails as jest.Mock).mockResolvedValueOnce({
      data: mockProject,
      error: null,
    });
    (playbooksService.getProjectPhases as jest.Mock).mockResolvedValueOnce({
      data: [],
      error: null,
    });
    (tasksService.fetchProjectTasks as jest.Mock).mockResolvedValueOnce({
      data: mockTasks,
      error: null,
    });

    await render(<ProjectTasksScreen />);

    expect(await screen.findByRole('header', { name: 'Tasks & Work' })).toBeTruthy();
    expect(screen.getByText('CS50 Mobile Workspace')).toBeTruthy();
    expect(screen.getByText('Design Database Schema')).toBeTruthy();
    expect(screen.getByText('Overdue Bugfix')).toBeTruthy();
    expect(screen.getByText('OVERDUE')).toBeTruthy();
    expect(screen.getByText('Alice Smith')).toBeTruthy();
    expect(screen.getByText('New Task')).toBeTruthy();
  });

  it('toggles task status when checkbox is pressed', async () => {
    (projectsService.fetchProjectDetails as jest.Mock).mockResolvedValueOnce({
      data: mockProject,
      error: null,
    });
    (playbooksService.getProjectPhases as jest.Mock).mockResolvedValueOnce({
      data: [],
      error: null,
    });
    (tasksService.fetchProjectTasks as jest.Mock).mockResolvedValueOnce({
      data: mockTasks,
      error: null,
    });
    (tasksService.updateTask as jest.Mock).mockResolvedValueOnce({
      data: { ...mockTasks[1], status: 'done' },
      error: null,
    });

    await render(<ProjectTasksScreen />);

    const checkbox = await screen.findByLabelText('Mark task Overdue Bugfix as done');
    fireEvent.press(checkbox);

    await waitFor(() => {
      expect(tasksService.updateTask).toHaveBeenCalledWith('task-2', { status: 'done' });
    });
  });

  it('displays empty state when no tasks exist', async () => {
    (projectsService.fetchProjectDetails as jest.Mock).mockResolvedValueOnce({
      data: mockProject,
      error: null,
    });
    (playbooksService.getProjectPhases as jest.Mock).mockResolvedValueOnce({
      data: [],
      error: null,
    });
    (tasksService.fetchProjectTasks as jest.Mock).mockResolvedValueOnce({
      data: [],
      error: null,
    });

    await render(<ProjectTasksScreen />);

    expect(await screen.findByText('No tasks found')).toBeTruthy();
  });
});
