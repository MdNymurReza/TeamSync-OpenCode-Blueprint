import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import SignUpScreen from '@/../app/(auth)/sign-up';
import { AuthProvider } from '@/features/auth';

describe('SignUpScreen (Phase 2)', () => {
  it('renders registration fields', async () => {
    await render(
      <AuthProvider>
        <SignUpScreen />
      </AuthProvider>
    );

    expect(screen.getByRole('header', { name: 'Create Your Account' })).toBeTruthy();
    expect(screen.getByText('Full Name')).toBeTruthy();
    expect(screen.getByText('University / Institution')).toBeTruthy();
    expect(screen.getByText('Email Address')).toBeTruthy();
  });

  it('validates missing required inputs', async () => {
    await render(
      <AuthProvider>
        <SignUpScreen />
      </AuthProvider>
    );

    const submitBtn = screen.getByRole('button', { name: 'Create Account' });
    fireEvent.press(submitBtn);

    expect(await screen.findByText('Please enter your full name.')).toBeTruthy();
  });
});
