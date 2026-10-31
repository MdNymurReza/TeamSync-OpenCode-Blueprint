import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import ProjectPulseScreen from '@/../app/projects/[id]/pulse';
import { pulseService } from '@/features/pulse';
import { projectsService } from '@/features/projects';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'proj-1' }),
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

jest.mock('@/features/projects', () => ({
  projectsService: {
    fetchProjectDetails: jest.fn(),
  },
}));

jest.mock('@/features/pulse', () => {
  const actual = jest.requireActual('@/features/pulse');
  return {
    ...actual,
    pulseService: {
      fetchProjectPulseCheckins: jest.fn(),
      submitPulseCheckin: jest.fn(),
    },
  };
});

describe('ProjectPulseScreen (Phase 9)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (projectsService.fetchProjectDetails as jest.Mock).mockResolvedValue({
      data: {
        id: 'proj-1',
        name: 'Capstone Rover',
        currentUserRole: 'member',
      },
      error: null,
    });
    (pulseService.fetchProjectPulseCheckins as jest.Mock).mockResolvedValue({
      data: [
        {
          id: 'pulse-1',
          project_id: 'proj-1',
          user_id: 'user-2',
          week_start_date: '2026-10-26',
          status: 'needs_support',
          blocker_details: 'Need help calibrating IMU',
          follow_up_note: 'Sync after Thursday lab',
          created_at: '2026-10-31T09:00:00.000Z',
          updated_at: '2026-10-31T09:00:00.000Z',
          user: { full_name: 'Alex Rivera' },
        },
      ],
      error: null,
    });
  });

  it('renders non-ranking privacy notice, weekly summary, and submits a pulse check-in', async () => {
    (pulseService.submitPulseCheckin as jest.Mock).mockResolvedValue({
      data: {
        id: 'pulse-2',
        project_id: 'proj-1',
        user_id: 'user-1',
        week_start_date: '2026-10-26',
        status: 'blocked',
        blocker_details: 'Waiting on motor controller shipment',
        follow_up_note: 'Test in simulation meanwhile',
        created_at: '2026-10-31T10:00:00.000Z',
        updated_at: '2026-10-31T10:00:00.000Z',
      },
      error: null,
    });

    await render(<ProjectPulseScreen />);

    await waitFor(() => {
      expect(screen.getByRole('header', { name: 'Team Pulse' })).toBeTruthy();
    });

    expect(
      screen.getByText(/Self-reports are never used as verified productivity measures/i)
    ).toBeTruthy();
    expect(screen.getByText('Need help calibrating IMU')).toBeTruthy();
    expect(screen.getByText('Sync after Thursday lab')).toBeTruthy();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Submit weekly Team Pulse check-in' })
    );
    await fireEvent.press(
      screen.getByRole('button', { name: 'Select pulse status Blocked' })
    );
    await fireEvent.changeText(
      screen.getByPlaceholderText('What is blocking you or where can a teammate help?'),
      'Waiting on motor controller shipment'
    );
    await fireEvent.changeText(
      screen.getByPlaceholderText('Next step or pair session planned...'),
      'Test in simulation meanwhile'
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Save Check-in' }));

    await waitFor(() => {
      expect(pulseService.submitPulseCheckin).toHaveBeenCalledWith(
        'proj-1',
        expect.objectContaining({
          status: 'blocked',
          blocker_details: 'Waiting on motor controller shipment',
          follow_up_note: 'Test in simulation meanwhile',
        })
      );
    });
  });
});
