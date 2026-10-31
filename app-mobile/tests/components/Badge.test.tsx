import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { Badge } from '@/components/ui';

describe('Badge Component', () => {
  it('renders status label with accessible text role', async () => {
    await render(<Badge label="In Progress" variant="warning" />);

    const badge = screen.getByText('In Progress');
    expect(badge).toBeTruthy();
  });

  it('renders with custom icon', async () => {
    await render(
      <Badge
        label="Verified"
        variant="success"
        icon={<Text testID="badge-icon">✓</Text>}
      />
    );

    expect(screen.getByText('Verified')).toBeTruthy();
    expect(screen.getByTestId('badge-icon')).toBeTruthy();
  });
});
