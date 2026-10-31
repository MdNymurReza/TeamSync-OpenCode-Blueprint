import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, spacing, typography } from '@/theme';

export interface SectionHeaderProps {
  title: string;
  /** Optional muted count/summary shown after the title. */
  meta?: string;
  /** Optional trailing action (e.g. a text Button). */
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Consistent section title row with optional trailing action. */
export function SectionHeader({ title, meta, action, style }: SectionHeaderProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.textRow}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      </View>
      {action ? <View>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    minHeight: 32,
  },
  textRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  title: {
    ...typography.titleSmall,
    color: colors.textPrimary,
  },
  meta: {
    ...typography.bodyMedium,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
});

