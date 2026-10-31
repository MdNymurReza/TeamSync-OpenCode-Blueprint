import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import SignInScreen from '@/../app/(auth)/sign-in';
import { AuthProvider } from '@/features/auth';

describe('SignInScreen (Phase 2)', () => {
  it('renders welcome title and input fields', async () => {
    await render(
      <AuthProvider>
        <SignInScreen />
      </AuthProvider>
    );

    expect(screen.getByRole('header', { name: 'Welcome to MelBond' })).toBeTruthy();
    expect(screen.getByText('Email Address')).toBeTruthy();
    expect(screen.getByText('Password')).toBeTruthy();
  });

  it('validates required fields on submission', async () => {
    await render(
      <AuthProvider>
        <SignInScreen />
      </AuthProvider>
    );

    const submitBtn = screen.getByRole('button', { name: 'Sign In' });
    fireEvent.press(submitBtn);

    expect(await screen.findByText('Please enter your email address.')).toBeTruthy();
  });
});
