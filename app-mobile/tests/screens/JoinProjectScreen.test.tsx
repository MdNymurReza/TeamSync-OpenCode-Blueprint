import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import JoinProjectScreen from '@/../app/projects/join';
import { projectsService } from '@/features/projects';

jest.mock('@/features/projects', () => {
  const actual = jest.requireActual('@/features/projects');
  return {
    ...actual,
    projectsService: {
      redeemInvitation: jest.fn(),
    },
  };
});

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: mockReplace,
    back: jest.fn(),
  }),
}));

describe('JoinProjectScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders invitation input and validates short input', async () => {
    await render(<JoinProjectScreen />);

    expect(screen.getByRole('header', { name: 'Join Workspace' })).toBeTruthy();

    const joinBtn = screen.getByRole('button', { name: 'Submit Join Project' });
    fireEvent.press(joinBtn);

    expect(await screen.findByText('Please enter an invitation code.')).toBeTruthy();
    expect(projectsService.redeemInvitation).not.toHaveBeenCalled();
  });

  it('submits uppercase invitation code', async () => {
    (projectsService.redeemInvitation as jest.Mock).mockResolvedValueOnce({
      data: 'joined-project-id',
      error: null,
    });

    await render(<JoinProjectScreen />);

    const input = screen.getByLabelText('Invitation Code');
    fireEvent.changeText(input, 'k8m2px');
    await screen.findByDisplayValue('K8M2PX');

    const joinBtn = screen.getByRole('button', { name: 'Submit Join Project' });
    fireEvent.press(joinBtn);

    await waitFor(() => {
      expect(projectsService.redeemInvitation).toHaveBeenCalledWith('K8M2PX');
    });
  });
});
