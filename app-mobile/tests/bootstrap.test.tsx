import React from 'react';
import { render, screen } from '@testing-library/react-native';

import RootIndex from '../app/index';
import TabLayout from '../app/(tabs)/_layout';

// Mock expo-router Tabs and Redirect
jest.mock('expo-router', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View, Text } = require('react-native');

  const MockTabs = ({ children }: { children: React.ReactNode }) => (
    <View testID="mock-tabs">{children}</View>
  );
  MockTabs.Screen = ({ name }: { name: string }) => <View testID={`tab-${name}`} />;

  return {
    Tabs: MockTabs,
    Redirect: ({ href }: { href: string }) => <Text testID="redirect-target">{href}</Text>,
  };
});

import { AuthProvider } from '@/features/auth';

describe('Root Navigation Shell', () => {
  it('renders tab navigation shell when unconfigured dev mode', async () => {
    await render(
      <AuthProvider>
        <TabLayout />
      </AuthProvider>
    );
    expect(screen.getByTestId('mock-tabs')).toBeTruthy();
  });

  it('redirects RootIndex to (tabs) when unconfigured dev mode', async () => {
    await render(
      <AuthProvider>
        <RootIndex />
      </AuthProvider>
    );
    const target = screen.getByTestId('redirect-target');
    expect(target.props.children).toBe('/(tabs)');
  });
});
