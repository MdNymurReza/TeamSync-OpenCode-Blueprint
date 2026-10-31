import React from 'react';
import { Button, Text, View } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import { ToastProvider, useToast } from '@/components/ui/Toast';

function TestConsumerComponent() {
  const toast = useToast();

  return (
    <View>
      <Text testID="consumer-label">Ready</Text>
      <Button
        title="Trigger Success"
        testID="btn-success"
        onPress={() => toast.showSuccess('Operation completed!', 'Success Title')}
      />
      <Button
        title="Trigger Error"
        testID="btn-error"
        onPress={() => toast.showError('Something broke', 'Error Title')}
      />
      <Button
        title="Trigger Info"
        testID="btn-info"
        onPress={() => toast.showInfo('Information update')}
      />
      <Button
        title="Trigger Hide"
        testID="btn-hide"
        onPress={() => toast.hideToast()}
      />
    </View>
  );
}

describe('Toast & Haptics System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children and displays a floating toast with haptic feedback on success', async () => {
    await render(
      <ToastProvider>
        <TestConsumerComponent />
      </ToastProvider>
    );

    expect(screen.getByTestId('consumer-label')).toBeTruthy();
    expect(screen.queryByTestId('app-toast')).toBeNull();

    // Trigger success toast
    await fireEvent.press(screen.getByTestId('btn-success'));

    // Toast banner appears
    expect(await screen.findByTestId('app-toast')).toBeTruthy();
    expect(screen.getByText('Success Title')).toBeTruthy();
    expect(screen.getByText('Operation completed!')).toBeTruthy();

    // Verifies success haptic triggered
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
  });

  it('displays error toast and triggers error haptic', async () => {
    await render(
      <ToastProvider>
        <TestConsumerComponent />
      </ToastProvider>
    );

    await fireEvent.press(screen.getByTestId('btn-error'));

    expect(await screen.findByTestId('app-toast')).toBeTruthy();
    expect(screen.getByText('Error Title')).toBeTruthy();
    expect(screen.getByText('Something broke')).toBeTruthy();

    expect(Haptics.notificationAsync).toHaveBeenCalledWith('error');
  });

  it('displays info toast and triggers light impact haptic', async () => {
    await render(
      <ToastProvider>
        <TestConsumerComponent />
      </ToastProvider>
    );

    await fireEvent.press(screen.getByTestId('btn-info'));

    expect(await screen.findByTestId('app-toast')).toBeTruthy();
    expect(screen.getByText('Information update')).toBeTruthy();

    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
  });

  it('dismisses toast when tapped', async () => {
    await render(
      <ToastProvider>
        <TestConsumerComponent />
      </ToastProvider>
    );

    await fireEvent.press(screen.getByTestId('btn-success'));
    expect(await screen.findByTestId('app-toast')).toBeTruthy();

    // Dismiss by pressing the toast card
    await fireEvent.press(screen.getByTestId('app-toast-dismiss'));

    await waitFor(() => {
      expect(screen.queryByTestId('app-toast')).toBeNull();
    });
  });
});
