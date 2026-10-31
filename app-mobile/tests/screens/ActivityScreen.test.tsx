import React from 'react';
import { render, screen } from '@testing-library/react-native';

import ActivityScreen from '@/../app/(tabs)/activity';
import { AuthProvider } from '@/features/auth';

describe('ActivityScreen (Phases 1 & 9)', () => {
  it('renders activity header, workspace search controls, and informative stream empty state', async () => {
    await render(
      <AuthProvider>
        <ActivityScreen />
      </AuthProvider>
    );

    expect(screen.getByRole('header', { name: 'Activity & Updates' })).toBeTruthy();
    expect(
      screen.getByPlaceholderText('Search tasks, milestones, decisions, resources...')
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Filter search by All' })).toBeTruthy();
    expect(screen.getByText('No recent activity')).toBeTruthy();
  });
});
