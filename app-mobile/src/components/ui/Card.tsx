import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

import { colors, radii, shadows, spacing, touchTargets } from '@/theme';

export interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  variant?: 'default' | 'elevated' | 'outlined';
  accessibilityLabel?: string;
  testID?: string;
}

export function Card({
  children,
  style,
  onPress,
  variant = 'default',
  accessibilityLabel,
  testID,
}: CardProps) {
  const containerStyles: ViewStyle[] = [
    styles.base,
    styles[`variant_${variant}`],
  ];

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [
          containerStyles,
          styles.interactive,
          pressed && styles.pressed,
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View
      testID={testID}
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
      style={[containerStyles, style]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.base,
  },
  interactive: {
    minHeight: touchTargets.minTouchSize,
  },
  pressed: {
    backgroundColor: colors.surfaceSubtle,
  },
  variant_default: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  variant_outlined: {
    borderWidth: 1.5,
    borderColor: colors.borderMuted,
  },
  variant_elevated: {
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
});
