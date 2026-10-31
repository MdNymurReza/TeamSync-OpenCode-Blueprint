import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { LoadingView } from '@/components/ui';

describe('LoadingView Component', () => {
  it('renders progressbar with accessible message', async () => {
    await render(<LoadingView message="Authenticating session..." />);

    const loading = screen.getByRole('progressbar');
    expect(loading).toBeTruthy();
    expect(screen.getByText('Authenticating session...')).toBeTruthy();
  });

  it('renders inline loading mode', async () => {
    await render(<LoadingView message="Syncing..." inline={true} />);

    const loading = screen.getByRole('progressbar');
    expect(loading).toBeTruthy();
    expect(screen.getByText('Syncing...')).toBeTruthy();
  });
});
