import React from 'react';
import { render, screen } from '@testing-library/react-native';

import ActivityScreen from '@/../app/(tabs)/activity';

describe('ActivityScreen (Phase 1)', () => {
  it('renders activity header and informative stream empty state', async () => {
    await render(<ActivityScreen />);

    expect(screen.getByRole('header', { name: 'Activity & Updates' })).toBeTruthy();
    expect(screen.getByText('No recent activity')).toBeTruthy();
  });
});
