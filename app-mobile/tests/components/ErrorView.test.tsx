import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { ErrorView } from '@/components/ui';

describe('ErrorView Component', () => {
  it('renders error alert with title and message', async () => {
    await render(
      <ErrorView
        title="Network Error"
        message="Unable to reach Supabase. Check your connection."
      />
    );

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Network Error' })).toBeTruthy();
    expect(
      screen.getByText('Unable to reach Supabase. Check your connection.')
    ).toBeTruthy();
  });

  it('renders retry button and triggers callback', async () => {
    const onRetryMock = jest.fn();
    await render(
      <ErrorView
        message="Failed to load meeting minutes."
        onRetry={onRetryMock}
        retryTitle="Reload Minutes"
      />
    );

    const button = screen.getByRole('button', { name: 'Reload Minutes' });
    fireEvent.press(button);
    expect(onRetryMock).toHaveBeenCalledTimes(1);
  });

  it('renders inline error banner mode', async () => {
    await render(
      <ErrorView message="Validation failed." inline={true} />
    );

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Validation failed.')).toBeTruthy();
  });
});
