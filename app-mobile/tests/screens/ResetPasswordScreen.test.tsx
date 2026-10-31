import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import ResetPasswordScreen from '@/../app/(auth)/reset-password';
import { AuthProvider } from '@/features/auth';

describe('ResetPasswordScreen (Phase 2)', () => {
  it('renders recovery email field', async () => {
    await render(
      <AuthProvider>
        <ResetPasswordScreen />
      </AuthProvider>
    );

    expect(screen.getByRole('header', { name: 'Password Recovery' })).toBeTruthy();
    expect(screen.getByText('Email Address')).toBeTruthy();
  });

  it('validates invalid email format', async () => {
    await render(
      <AuthProvider>
        <ResetPasswordScreen />
      </AuthProvider>
    );

    const submitBtn = screen.getByRole('button', { name: 'Send Recovery Link' });
    fireEvent.press(submitBtn);

    expect(await screen.findByText('Please enter a valid email address.')).toBeTruthy();
  });
});
