import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { AuthProvider, useAuth } from '@/features/auth';

function TestConsumer() {
  const { user, isLoading, isConfigured } = useAuth();
  return (
    <>
      <Text testID="auth-loading">{isLoading ? 'loading' : 'ready'}</Text>
      <Text testID="auth-user">{user ? user.email : 'anonymous'}</Text>
      <Text testID="auth-configured">{isConfigured ? 'configured' : 'unconfigured'}</Text>
    </>
  );
}

describe('AuthContext', () => {
  it('provides authentication state to consumers', async () => {
    await render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-loading')).toBeTruthy();
    expect(screen.getByTestId('auth-user')).toBeTruthy();
    expect(screen.getByTestId('auth-configured')).toBeTruthy();
  });
});
