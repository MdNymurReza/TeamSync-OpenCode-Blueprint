import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import ProjectsScreen from '@/../app/(tabs)/projects';
import { projectsService } from '@/features/projects';

jest.mock('@/features/projects', () => {
  const actual = jest.requireActual('@/features/projects');
  return {
    ...actual,
    projectsService: {
      fetchUserProjects: jest.fn(),
    },
  };
});

// Mock expo-router useRouter
const mockPush = jest.fn();
jest.mock('expo-router', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  return {
    useRouter: () => ({
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
    }),
    ScrollView: RN.ScrollView,
    View: RN.View,
    Text: RN.Text,
    Pressable: RN.Pressable,
    RefreshControl: RN.RefreshControl,
  };
});

describe('ProjectsScreen (Phase 3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders header, action buttons, and empty state when user has no projects', async () => {
    (projectsService.fetchUserProjects as jest.Mock).mockResolvedValueOnce({
      data: [],
      error: null,
    });

    await render(<ProjectsScreen />);

    expect(await screen.findByRole('header', { name: 'Workspaces' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Create a new project' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Join project using invitation code' })).toBeTruthy();
    expect(screen.getByText('No active workspaces')).toBeTruthy();
  });

  it('renders project cards with role badges when projects exist', async () => {
    (projectsService.fetchUserProjects as jest.Mock).mockResolvedValueOnce({
      data: [
        {
          id: 'proj-1',
          name: 'Distributed Systems',
          description: 'Raft consensus project',
          project_type: 'software_project',
          course_code: 'CS450',
          semester: 'Fall 2026',
          is_archived: false,
          created_by: 'user-1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          currentUserRole: 'owner',
        },
      ],
      error: null,
    });

    await render(<ProjectsScreen />);

    expect(await screen.findByText('Distributed Systems')).toBeTruthy();
    expect(screen.getByText('Raft consensus project')).toBeTruthy();
    expect(screen.getByText('OWNER')).toBeTruthy();
    expect(screen.getByText('CS450')).toBeTruthy();
  });

  it('navigates to create project when New Project button is pressed', async () => {
    (projectsService.fetchUserProjects as jest.Mock).mockResolvedValueOnce({
      data: [],
      error: null,
    });

    await render(<ProjectsScreen />);

    const newBtn = await screen.findByRole('button', { name: 'Create a new project' });
    fireEvent.press(newBtn);

    expect(mockPush).toHaveBeenCalledWith('/projects/new');
  });
});
