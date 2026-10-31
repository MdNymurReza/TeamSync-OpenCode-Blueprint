import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import CreateTaskScreen from '@/../app/projects/[id]/tasks/new';
import { playbooksService } from '@/features/playbooks';
import { projectsService } from '@/features/projects';
import { tasksService } from '@/features/tasks';

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

jest.mock('@/features/tasks', () => {
  const actual = jest.requireActual('@/features/tasks');
  return {
    ...actual,
    tasksService: {
      createTask: jest.fn(),
    },
  };
});

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'proj-123' }),
  useRouter: () => ({
    push: jest.fn(),
    back: mockBack,
  }),
}));

describe('CreateTaskScreen (Phase 5)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockProject = {
    id: 'proj-123',
    name: 'CS50 Workspace',
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

  it('renders form inputs and validates required title', async () => {
    (projectsService.fetchProjectDetails as jest.Mock).mockResolvedValueOnce({
      data: mockProject,
      error: null,
    });
    (playbooksService.getProjectPhases as jest.Mock).mockResolvedValueOnce({
      data: [],
      error: null,
    });
    (projectsService.fetchProjectMembers as jest.Mock).mockResolvedValueOnce({
      data: [],
      error: null,
    });

    await render(<CreateTaskScreen />);

    expect(await screen.findByRole('header', { name: 'Create New Task' })).toBeTruthy();

    const submitBtn = screen.getByRole('button', { name: 'Create Task' });
    fireEvent.press(submitBtn);

    expect(await screen.findByText('Task title is required')).toBeTruthy();
    expect(tasksService.createTask).not.toHaveBeenCalled();
  });

  it('validates invalid due date format', async () => {
    (projectsService.fetchProjectDetails as jest.Mock).mockResolvedValueOnce({
      data: mockProject,
      error: null,
    });
    (playbooksService.getProjectPhases as jest.Mock).mockResolvedValueOnce({
      data: [],
      error: null,
    });
    (projectsService.fetchProjectMembers as jest.Mock).mockResolvedValueOnce({
      data: [],
      error: null,
    });

    await render(<CreateTaskScreen />);

    expect(await screen.findByRole('header', { name: 'Create New Task' })).toBeTruthy();

    const titleInput = screen.getByPlaceholderText('e.g. Implement Supabase Auth RLS');
    fireEvent.changeText(titleInput, 'Valid Task Title');
    await screen.findByDisplayValue('Valid Task Title');

    const dateInput = screen.getByPlaceholderText('YYYY-MM-DD (e.g. 2026-11-15)');
    fireEvent.changeText(dateInput, 'invalid-date');
    await screen.findByDisplayValue('invalid-date');

    const submitBtn = screen.getByRole('button', { name: 'Create Task' });
    fireEvent.press(submitBtn);

    expect(await screen.findByText('Enter a valid date in YYYY-MM-DD format')).toBeTruthy();
    expect(tasksService.createTask).not.toHaveBeenCalled();
  });

  it('submits form with valid data and navigates back', async () => {
    (projectsService.fetchProjectDetails as jest.Mock).mockResolvedValueOnce({
      data: mockProject,
      error: null,
    });
    (playbooksService.getProjectPhases as jest.Mock).mockResolvedValueOnce({
      data: [{ id: 'phase-1', name: 'Planning', sequence_order: 0, is_completed: false }],
      error: null,
    });
    (projectsService.fetchProjectMembers as jest.Mock).mockResolvedValueOnce({
      data: [
        {
          id: 'pm-1',
          project_id: 'proj-123',
          user_id: 'user-1',
          role: 'member',
          profile: { full_name: 'Bob Jones' },
        },
      ],
      error: null,
    });
    (tasksService.createTask as jest.Mock).mockResolvedValueOnce({
      data: { id: 'created-task-1', title: 'Valid Task' },
      error: null,
    });

    await render(<CreateTaskScreen />);

    expect(await screen.findByRole('header', { name: 'Create New Task' })).toBeTruthy();

    const titleInput = screen.getByPlaceholderText('e.g. Implement Supabase Auth RLS');
    fireEvent.changeText(titleInput, 'Valid Task');
    await screen.findByDisplayValue('Valid Task');

    const submitBtn = screen.getByRole('button', { name: 'Create Task' });
    fireEvent.press(submitBtn);

    await waitFor(() => {
      expect(tasksService.createTask).toHaveBeenCalledWith(
        'proj-123',
        expect.objectContaining({ title: 'Valid Task' })
      );
      expect(mockBack).toHaveBeenCalled();
    });
  });
});
