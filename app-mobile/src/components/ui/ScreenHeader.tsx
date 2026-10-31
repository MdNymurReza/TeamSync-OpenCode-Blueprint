import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, spacing, typography } from '@/theme';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Small uppercase label shown above the title (e.g. a date or context). */
  eyebrow?: string;
  /** Optional trailing element such as an avatar or icon button. */
  accessory?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Large in-content page title used at the top of top-level screens. */
export function ScreenHeader({ title, subtitle, eyebrow, accessory, style }: ScreenHeaderProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.textCol}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {accessory ? <View style={styles.accessory}>{accessory}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  textCol: {
    flex: 1,
  },
  eyebrow: {
    ...typography.overline,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.display,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  accessory: {
    marginLeft: spacing.md,
  },
});

