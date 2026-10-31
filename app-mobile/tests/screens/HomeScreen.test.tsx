import React from 'react';
import { render, screen } from '@testing-library/react-native';

import HomeScreen from '@/../app/(tabs)/index';

describe('HomeScreen (Phase 1)', () => {
  it('renders workspace greeting and phase 1 active badge', async () => {
    await render(<HomeScreen />);

    expect(screen.getByRole('header', { name: 'Welcome to MelBond' })).toBeTruthy();
    expect(screen.getByText('Phase 1 Active')).toBeTruthy();
    expect(screen.getByText('Upcoming Tasks')).toBeTruthy();
  });

  it('renders no misleading interactive dead buttons', async () => {
    await render(<HomeScreen />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});
