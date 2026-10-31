import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { avatarPalette, colors, radii } from '@/theme';

export interface AvatarProps {
  /** Display name used for initials and deterministic color. */
  name: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Returns up to two uppercase initials from a display name. */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase() || '?';
}

/** Deterministically maps a name to an avatar palette color. */
export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % avatarPalette.length;
  return avatarPalette[index] ?? colors.primary;
}

/**
 * Initials avatar. Decorative by default: the adjacent name text carries the
 * accessible label, so screen readers do not announce initials twice.
 */
export function Avatar({ name, size = 40, style, testID }: AvatarProps) {
  return (
    <View
      testID={testID}
      style={[
        styles.base,
        {
          width: size,
          height: size,
          backgroundColor: getAvatarColor(name),
        },
        style,
      ]}
    >
      <Text
        style={[styles.text, { fontSize: Math.round(size * 0.38) }]}
        allowFontScaling={false}
      >
        {getInitials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: colors.textInverse,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

