import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import CreateProjectScreen from '@/../app/projects/new';
import { projectsService } from '@/features/projects';

jest.mock('@/features/projects', () => {
  const actual = jest.requireActual('@/features/projects');
  return {
    ...actual,
    projectsService: {
      createProject: jest.fn(),
    },
  };
});

const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: mockReplace,
    back: mockBack,
  }),
}));

describe('CreateProjectScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders form inputs and handles validation', async () => {
    await render(<CreateProjectScreen />);

    expect(screen.getByRole('header', { name: 'Create Workspace' })).toBeTruthy();
    expect(screen.getByText('Workspace Type *')).toBeTruthy();

    const submitBtn = screen.getByRole('button', { name: 'Submit Create Project' });
    fireEvent.press(submitBtn);

    expect(await screen.findByText('Please enter a project name.')).toBeTruthy();
    expect(projectsService.createProject).not.toHaveBeenCalled();
  });

  it('submits create project when valid name is entered', async () => {
    (projectsService.createProject as jest.Mock).mockResolvedValueOnce({
      data: 'new-id',
      error: null,
    });

    await render(<CreateProjectScreen />);

    const nameInput = screen.getByLabelText('Project Name');
    fireEvent.changeText(nameInput, 'Autonomous Drone Swarm');
    await screen.findByDisplayValue('Autonomous Drone Swarm');

    const submitBtn = screen.getByRole('button', { name: 'Submit Create Project' });
    fireEvent.press(submitBtn);

    await waitFor(() => {
      expect(projectsService.createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Autonomous Drone Swarm',
          project_type: 'course_assignment',
        })
      );
    });
  });
});
