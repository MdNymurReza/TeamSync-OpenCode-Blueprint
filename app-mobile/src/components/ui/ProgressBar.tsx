import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, radii } from '@/theme';

export interface ProgressBarProps {
  /** Completed amount. */
  value: number;
  /** Total amount. A total of 0 renders an empty bar. */
  label: string;
  total: number;
  tone?: 'primary' | 'success';
  height?: number;
  style?: StyleProp<ViewStyle>;
}

/** Linear progress bar with a screen-reader text alternative. */
export function ProgressBar({
  value,
  total,
  label,
  tone = 'primary',
  height = 8,
  style,
}: ProgressBarProps) {
  const safeTotal = Math.max(0, total);
  const safeValue = Math.min(Math.max(0, value), safeTotal);
  const percent = safeTotal === 0 ? 0 : Math.round((safeValue / safeTotal) * 100);

  return (
    <View
      accessible={true}
      accessibilityRole="progressbar"
      accessibilityLabel={`${label}: ${safeValue} of ${safeTotal} complete`}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      style={[styles.track, { height, borderRadius: height / 2 }, style]}
    >
      <View
        style={[
          styles.fill,
          {
            width: `${percent}%`,
            borderRadius: height / 2,
            backgroundColor: tone === 'success' ? colors.brandMint : colors.primary,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: colors.surfaceHover,
    overflow: 'hidden',
    borderRadius: radii.full,
  },
  fill: {
    height: '100%',
  },
});
