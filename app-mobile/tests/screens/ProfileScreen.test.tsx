import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import ProfileScreen from '@/../app/(tabs)/profile';
import { AuthProvider } from '@/features/auth';

describe('ProfileScreen (Professional Student Profile, Avatar Upload & Settings)', () => {
  it('renders profile hero, full profile details, notification & privacy preferences, and backend status', async () => {
    await render(
      <AuthProvider>
        <ProfileScreen />
      </AuthProvider>
    );

    expect(screen.getByRole('header', { name: 'Profile & Account' })).toBeTruthy();
    expect(screen.getByTestId('profile-hero-card')).toBeTruthy();
    expect(screen.getByTestId('profile-details-card')).toBeTruthy();
    expect(screen.getByText('Full Profile Details')).toBeTruthy();
    expect(screen.getByText('Notifications & Privacy')).toBeTruthy();
    expect(
      screen.getByRole('switch', {
        name: 'Toggle Minimize Lock-Screen Content (Privacy)',
      })
    ).toBeTruthy();
    expect(screen.getByText('Backend Status')).toBeTruthy();
  });

  it('allows uploading/selecting a profile picture and editing full student profile details', async () => {
    await render(
      <AuthProvider>
        <ProfileScreen />
      </AuthProvider>
    );

    // 1. Open Profile Picture Upload Studio modal, verify gallery/camera buttons, and choose preset
    await fireEvent.press(screen.getByTestId('upload-profile-photo-button'));
    expect(await screen.findByTestId('avatar-upload-modal')).toBeTruthy();
    expect(screen.getByTestId('pick-gallery-button')).toBeTruthy();
    expect(screen.getByTestId('take-photo-button')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('pick-gallery-button'));
    await fireEvent.press(screen.getByTestId('avatar-preset-scholar-azure'));
    await fireEvent.press(screen.getByTestId('save-avatar-button'));

    expect(await screen.findByText('Custom Photo')).toBeTruthy();

    // 2. Open Edit Full Profile Details modal and update name, university, and department
    await fireEvent.press(screen.getByTestId('open-edit-profile-button'));
    expect(await screen.findByTestId('edit-profile-modal')).toBeTruthy();

    await fireEvent.changeText(
      screen.getByTestId('edit-profile-fullname-input'),
      'Dr. Elena Vance'
    );
    await fireEvent.changeText(
      screen.getByTestId('edit-profile-university-input'),
      'MIT'
    );
    await fireEvent.changeText(
      screen.getByTestId('edit-profile-department-input'),
      'Robotics & AI'
    );
    await fireEvent.press(screen.getByTestId('save-profile-details-button'));

    expect(await screen.findAllByText('Dr. Elena Vance')).toHaveLength(2);
    expect(screen.getByText('MIT')).toBeTruthy();
    expect(screen.getByText('Robotics & AI')).toBeTruthy();
  });

  it('allows picking a photo from device gallery and saving it directly as avatar', async () => {
    await render(
      <AuthProvider>
        <ProfileScreen />
      </AuthProvider>
    );

    // Open upload studio modal
    await fireEvent.press(screen.getByTestId('upload-profile-photo-button'));
    expect(await screen.findByTestId('avatar-upload-modal')).toBeTruthy();

    // Pick from gallery - returns base64 / uri
    await fireEvent.press(screen.getByTestId('pick-gallery-button'));

    // Should indicate device photo is chosen
    expect(
      await screen.findByText('Device photo chosen and ready to save')
    ).toBeTruthy();

    // Save avatar directly without error
    await fireEvent.press(screen.getByTestId('save-avatar-button'));

    // Modal closes and displays Custom Photo badge
    expect(await screen.findByText('Custom Photo')).toBeTruthy();
  });
});
