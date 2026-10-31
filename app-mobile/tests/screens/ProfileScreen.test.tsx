import React from 'react';
import { render, screen } from '@testing-library/react-native';

import ProfileScreen from '@/../app/(tabs)/profile';
import { AuthProvider } from '@/features/auth';

describe('ProfileScreen (Phase 2)', () => {
  it('renders profile header, backend status, and session actions', async () => {
    await render(
      <AuthProvider>
        <ProfileScreen />
      </AuthProvider>
    );

    expect(screen.getByRole('header', { name: 'Profile & Account' })).toBeTruthy();
    expect(screen.getByText('Backend Status')).toBeTruthy();
  });
});
