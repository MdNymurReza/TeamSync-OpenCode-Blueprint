import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import TaskDetailsScreen from '@/../app/projects/[id]/tasks/[taskId]';
import { projectsService } from '@/features/projects';
import { tasksService } from '@/features/tasks';

jest.mock('@/features/auth', () => ({
  useAuth: () => ({
    user: { id: 'user-123', email: 'test@student.edu' },
  }),
}));

jest.mock('@/features/projects', () => ({
  projectsService: {
    fetchProjectDetails: jest.fn(),
  },
}));

jest.mock('@/features/tasks', () => {
  const actual = jest.requireActual('@/features/tasks');
  return {
    ...actual,
    tasksService: {
      fetchTaskDetails: jest.fn(),
      fetchTaskChecklist: jest.fn(),
      fetchTaskComments: jest.fn(),
      updateTask: jest.fn(),
      toggleChecklistItem: jest.fn(),
      addChecklistItem: jest.fn(),
      addComment: jest.fn(),
      archiveTask: jest.fn(),
      deleteTask: jest.fn(),
    },
  };
});

// Mock expo-router
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'proj-123', taskId: 'task-1' }),
  useRouter: () => ({
    push: jest.fn(),
    back: mockBack,
  }),
}));

describe('TaskDetailsScreen (Phase 5)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockProject = {
    id: 'proj-123',
    name: 'CS50 Final Project',
    project_type: 'software_project' as const,
    currentUserRole: 'owner' as const,
    is_archived: false,
    created_by: 'user-123',
    created_at: '2026-10-30T00:00:00Z',
    updated_at: '2026-10-30T00:00:00Z',
    course_code: null,
    department: null,
    description: null,
    semester: null,
    target_date: null,
  };

  const mockTask = {
    id: 'task-1',
    project_id: 'proj-123',
    title: 'Setup Supabase RLS Policies',
    description: 'Ensure project isolation and authorization security rules',
    status: 'in_progress' as const,
    priority: 'urgent' as const,
    due_date: '2026-11-15T00:00:00Z',
    start_date: null,
    phase_id: 'phase-1',
    is_archived: false,
    created_by: 'user-123',
    updated_by: null,
    created_at: '2026-10-30T00:00:00Z',
    updated_at: '2026-10-30T00:00:00Z',
    primary_assignee: {
      id: 'user-123',
      full_name: 'Lead Developer',
      email: 'lead@uni.edu',
      avatar_url: null,
      university: null,
      department: null,
      created_at: '2026-10-30T00:00:00Z',
      updated_at: '2026-10-30T00:00:00Z',
    },
  };

  const mockChecklist = [
    {
      id: 'check-1',
      task_id: 'task-1',
      title: 'Write policy for SELECT',
      is_completed: true,
      sequence_order: 0,
      created_at: '2026-10-30T00:00:00Z',
    },
    {
      id: 'check-2',
      task_id: 'task-1',
      title: 'Write policy for INSERT and UPDATE',
      is_completed: false,
      sequence_order: 1,
      created_at: '2026-10-30T00:00:00Z',
    },
  ];

  const mockComments = [
    {
      id: 'comm-1',
      task_id: 'task-1',
      user_id: 'user-123',
      content: 'Draft migration is ready in supabase/migrations folder',
      created_at: '2026-10-30T01:00:00Z',
      updated_at: '2026-10-30T01:00:00Z',
      author: {
        id: 'user-123',
        full_name: 'Lead Developer',
        email: 'lead@uni.edu',
        avatar_url: null,
        university: null,
        department: null,
        created_at: '2026-10-30T00:00:00Z',
        updated_at: '2026-10-30T00:00:00Z',
      },
    },
  ];

  it('renders task details, status chips, checklist, and comments', async () => {
    (projectsService.fetchProjectDetails as jest.Mock).mockResolvedValueOnce({
      data: mockProject,
      error: null,
    });
    (tasksService.fetchTaskDetails as jest.Mock).mockResolvedValueOnce({
      data: mockTask,
      error: null,
    });
    (tasksService.fetchTaskChecklist as jest.Mock).mockResolvedValueOnce({
      data: mockChecklist,
      error: null,
    });
    (tasksService.fetchTaskComments as jest.Mock).mockResolvedValueOnce({
      data: mockComments,
      error: null,
    });

    await render(<TaskDetailsScreen />);

    expect(await screen.findByRole('header', { name: 'Setup Supabase RLS Policies' })).toBeTruthy();
    expect(screen.getAllByText('Lead Developer').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Checklist (1/2)')).toBeTruthy();
    expect(screen.getByText('Write policy for SELECT')).toBeTruthy();
    expect(screen.getByText('Draft migration is ready in supabase/migrations folder')).toBeTruthy();
  });

  it('allows toggling checklist items', async () => {
    (projectsService.fetchProjectDetails as jest.Mock).mockResolvedValueOnce({
      data: mockProject,
      error: null,
    });
    (tasksService.fetchTaskDetails as jest.Mock).mockResolvedValueOnce({
      data: mockTask,
      error: null,
    });
    (tasksService.fetchTaskChecklist as jest.Mock).mockResolvedValueOnce({
      data: mockChecklist,
      error: null,
    });
    (tasksService.fetchTaskComments as jest.Mock).mockResolvedValueOnce({
      data: mockComments,
      error: null,
    });
    (tasksService.toggleChecklistItem as jest.Mock).mockResolvedValueOnce({
      data: { ...mockChecklist[1], is_completed: true },
      error: null,
    });

    await render(<TaskDetailsScreen />);

    const checkbox = await screen.findByLabelText('Checklist item: Write policy for INSERT and UPDATE');
    fireEvent.press(checkbox);

    await waitFor(() => {
      expect(tasksService.toggleChecklistItem).toHaveBeenCalledWith('check-2', true);
    });
  });

  it('allows status transition and reopening', async () => {
    (projectsService.fetchProjectDetails as jest.Mock).mockResolvedValueOnce({
      data: mockProject,
      error: null,
    });
    (tasksService.fetchTaskDetails as jest.Mock).mockResolvedValueOnce({
      data: mockTask,
      error: null,
    });
    (tasksService.fetchTaskChecklist as jest.Mock).mockResolvedValueOnce({
      data: [],
      error: null,
    });
    (tasksService.fetchTaskComments as jest.Mock).mockResolvedValueOnce({
      data: [],
      error: null,
    });
    (tasksService.updateTask as jest.Mock).mockResolvedValueOnce({
      data: { ...mockTask, status: 'done' },
      error: null,
    });

    await render(<TaskDetailsScreen />);

    const doneChip = await screen.findByLabelText('Set status to Done');
    fireEvent.press(doneChip);

    await waitFor(() => {
      expect(tasksService.updateTask).toHaveBeenCalledWith('task-1', { status: 'done' });
    });
  });
});
