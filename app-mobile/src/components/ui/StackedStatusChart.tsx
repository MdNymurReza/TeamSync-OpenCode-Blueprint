import React, { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { colors, radii, spacing, typography } from '@/theme';

export interface StackedStatusSegment {
  key: string;
  label: string;
  count: number;
  color: string;
}

export interface StackedStatusChartProps {
  segments: StackedStatusSegment[];
  total: number;
  title?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Animated multi-segment distribution bar chart + horizontal bar breakdown
 * with text + color legend for WCAG AA accessibility.
 */
export function StackedStatusChart({
  segments,
  total,
  title = 'Task Status Distribution',
  style,
  testID = 'stacked-status-chart',
}: StackedStatusChartProps) {
  const isTestEnv = process.env.NODE_ENV === 'test';
  const [revealAnim] = useState(() => new Animated.Value(isTestEnv ? 1 : 0));

  useEffect(() => {
    if (isTestEnv) return;
    const anim = Animated.timing(revealAnim, {
      toValue: 1,
      duration: 560,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [isTestEnv, revealAnim]);

  const safeTotal = Math.max(0, total);

  return (
    <View
      testID={testID}
      accessible={true}
      accessibilityLabel={`${title}: ${segments
        .map((s) => `${s.label} ${s.count}`)
        .join(', ')}`}
      style={[styles.container, style]}
    >
      {/* Multi-Segment Stacked Bar */}
      <View style={styles.stackedTrack}>
        {safeTotal === 0 ? (
          <View style={styles.emptyTrackFill} />
        ) : (
          segments
            .filter((seg) => seg.count > 0)
            .map((seg) => {
              const flexWeight = Math.max(0.06, seg.count / safeTotal);
              return (
                <Animated.View
                  key={seg.key}
                  style={[
                    styles.segmentBar,
                    {
                      flex: flexWeight,
                      backgroundColor: seg.color,
                      transform: [{ scaleX: revealAnim }],
                    },
                  ]}
                />
              );
            })
        )}
      </View>

      {/* Individual Horizontal Metric Bars + Legend */}
      <View style={styles.grid}>
        {segments.map((seg) => {
          const pct = safeTotal === 0 ? 0 : Math.round((seg.count / safeTotal) * 100);
          return (
            <View key={seg.key} style={styles.metricRow}>
              <View style={styles.metricLabelCol}>
                <View style={[styles.dot, { backgroundColor: seg.color }]} />
                <Text style={styles.metricLabel} numberOfLines={1}>
                  {seg.label}
                </Text>
              </View>
              <View style={styles.miniBarTrack}>
                <View
                  style={[
                    styles.miniBarFill,
                    {
                      width: `${pct}%`,
                      backgroundColor: seg.color,
                    },
                  ]}
                />
              </View>
              <Text style={styles.metricValue}>
                {seg.count} ({pct}%)
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  stackedTrack: {
    height: 12,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceHover,
    flexDirection: 'row',
    overflow: 'hidden',
    gap: 2,
  },
  emptyTrackFill: {
    flex: 1,
    backgroundColor: colors.surfaceHover,
  },
  segmentBar: {
    height: '100%',
    borderRadius: radii.xs,
  },
  grid: {
    gap: spacing.xs,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metricLabelCol: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 102,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  metricLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  miniBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSubtle,
    overflow: 'hidden',
  },
  miniBarFill: {
    height: '100%',
    borderRadius: radii.full,
  },
  metricValue: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
    width: 58,
    textAlign: 'right',
  },
});

