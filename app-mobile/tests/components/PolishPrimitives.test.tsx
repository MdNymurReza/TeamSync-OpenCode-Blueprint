import React from 'react';
import { render, screen } from '@testing-library/react-native';

import {
  AnimatedSplashOverlay,
  Avatar,
  getAvatarColor,
  getInitials,
  IconTile,
  ProgressBar,
  ScreenHeader,
  SectionHeader,
} from '@/components/ui';

describe('Phase 5.5 UI Polish Primitives & Animated Splash', () => {
  it('computes initials and deterministic avatar color', () => {
    expect(getInitials('Ada Lovelace')).toBe('AL');
    expect(getInitials('Single')).toBe('S');
    expect(getInitials('   ')).toBe('?');

    const colorA = getAvatarColor('Ada Lovelace');
    const colorB = getAvatarColor('Ada Lovelace');
    expect(colorA).toBe(colorB);
  });

  it('renders Avatar with initials', async () => {
    await render(<Avatar name="Grace Hopper" testID="avatar-gh" />);
    expect(screen.getByTestId('avatar-gh')).toBeTruthy();
    expect(screen.getByText('GH')).toBeTruthy();
  });

  it('renders ProgressBar with accessible progressbar role and value', async () => {
    await render(<ProgressBar value={3} total={5} label="Phases progress" />);
    const bar = screen.getByRole('progressbar', {
      name: 'Phases progress: 3 of 5 complete',
    });
    expect(bar).toBeTruthy();
    expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 60 });
  });

  it('renders ScreenHeader and SectionHeader with header roles', async () => {
    await render(
      <>
        <ScreenHeader eyebrow="Today" title="Main Title" subtitle="Subtext" />
        <SectionHeader title="Section Title" meta="3 items" />
        <IconTile name="folder-outline" tone="primary" />
      </>
    );

    expect(screen.getByRole('header', { name: 'Main Title' })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Section Title' })).toBeTruthy();
    expect(screen.getByText('Today')).toBeTruthy();
    expect(screen.getByText('3 items')).toBeTruthy();
  });

  it('skips blocking overlay in Jest environment by default', async () => {
    await render(<AnimatedSplashOverlay isAppReady={true} testID="splash-test" />);
    expect(screen.queryByTestId('splash-test')).toBeNull();
  });
});
