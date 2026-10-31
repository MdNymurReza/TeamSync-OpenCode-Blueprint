import React from 'react';
import { render, screen } from '@testing-library/react-native';

import ProfileScreen from '@/../app/(tabs)/profile';
import { AuthProvider } from '@/features/auth';

describe('ProfileScreen (Phases 2 & 9)', () => {
  it('renders profile header, notification & privacy preferences, and backend status', async () => {
    await render(
      <AuthProvider>
        <ProfileScreen />
      </AuthProvider>
    );

    expect(screen.getByRole('header', { name: 'Profile & Account' })).toBeTruthy();
    expect(screen.getByText('Notifications & Privacy')).toBeTruthy();
    expect(
      screen.getByRole('switch', {
        name: 'Toggle Minimize Lock-Screen Content (Privacy)',
      })
    ).toBeTruthy();
    expect(screen.getByText('Backend Status')).toBeTruthy();
  });
});
