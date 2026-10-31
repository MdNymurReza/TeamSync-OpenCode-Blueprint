import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button } from '@/components/ui';

describe('Button Component', () => {
  it('renders title and handles onPress event', async () => {
    const onPressMock = jest.fn();
    await render(<Button title="Submit Work" onPress={onPressMock} />);

    const button = screen.getByRole('button', { name: 'Submit Work' });
    expect(button).toBeTruthy();

    fireEvent.press(button);
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it('prevents onPress when disabled', async () => {
    const onPressMock = jest.fn();
    await render(<Button title="Disabled Action" onPress={onPressMock} disabled />);

    const button = screen.getByRole('button', { name: 'Disabled Action' });
    fireEvent.press(button);

    expect(onPressMock).not.toHaveBeenCalled();
    expect(button.props.accessibilityState.disabled).toBe(true);
  });

  it('displays loading state and prevents press', async () => {
    const onPressMock = jest.fn();
    await render(<Button title="Saving" onPress={onPressMock} loading />);

    const button = screen.getByRole('button', { name: 'Saving' });
    fireEvent.press(button);

    expect(onPressMock).not.toHaveBeenCalled();
    expect(button.props.accessibilityState.busy).toBe(true);
  });

  it('supports custom accessibilityLabel and hints', async () => {
    await render(
      <Button
        title="Delete"
        onPress={jest.fn()}
        variant="destructive"
        accessibilityLabel="Delete task permanently"
        accessibilityHint="Destroys task record and checklists"
      />
    );

    const button = screen.getByLabelText('Delete task permanently');
    expect(button).toBeTruthy();
    expect(button.props.accessibilityHint).toBe('Destroys task record and checklists');
  });
});
