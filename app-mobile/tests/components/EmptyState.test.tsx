import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { EmptyState } from '@/components/ui';

describe('EmptyState Component', () => {
  it('renders title and description', async () => {
    await render(
      <EmptyState
        title="No Milestones"
        description="Set up your first project milestone to track progress."
      />
    );

    expect(screen.getByRole('header', { name: 'No Milestones' })).toBeTruthy();
    expect(screen.getByText('Set up your first project milestone to track progress.')).toBeTruthy();
  });

  it('renders optional action button and handles tap', async () => {
    const onActionMock = jest.fn();
    await render(
      <EmptyState
        title="No Members"
        description="Invite peers to collaborate."
        actionTitle="Invite Member"
        onAction={onActionMock}
      />
    );

    const button = screen.getByRole('button', { name: 'Invite Member' });
    fireEvent.press(button);
    expect(onActionMock).toHaveBeenCalledTimes(1);
  });
});
