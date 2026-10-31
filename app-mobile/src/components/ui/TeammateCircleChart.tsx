import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import type { DashboardTeammateWorkloadItem } from '@/features/milestones/types';
import { colors, radii, spacing, typography } from '@/theme';
import { Badge } from './Badge';

const TEAMMATE_PALETTE = [
  '#0284C7', // Brand Azure
  '#10B981', // Brand Mint
  '#6366F1', // Indigo
  '#F59E0B', // Amber
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#64748B', // Slate
];

function getTeammateColor(index: number, userId: string): string {
  if (userId === 'unassigned') {
    return '#94A3B8';
  }
  return TEAMMATE_PALETTE[index % TEAMMATE_PALETTE.length] ?? colors.primary;
}

interface CircularRingProps {
  percent: number;
  size: number;
  strokeWidth: number;
  activeColor: string;
  trackColor?: string;
  children?: React.ReactNode;
}

/**
 * Pure React Native dual-semicircle donut ring gauge (100% Fabric-safe, zero SVG dependency).
 */
function CircularDonutGauge({
  percent,
  size,
  strokeWidth,
  activeColor,
  trackColor = colors.surfaceHover,
  children,
}: CircularRingProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));
  const halfSize = size / 2;

  // Right half rotates from -135deg (0%) to +45deg (50%)
  const rightProgress = Math.min(50, clamped) / 50;
  const rightDeg = Math.round(-135 + rightProgress * 180);

  // Left half rotates from -135deg (50%) to +45deg (100%)
  const leftProgress = Math.max(0, clamped - 50) / 50;
  const leftDeg = Math.round(-135 + leftProgress * 180);

  const innerSize = size - strokeWidth * 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Base Track Ring */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: halfSize,
          borderWidth: strokeWidth,
          borderColor: trackColor,
        }}
      />

      {/* Right Half Clip */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: halfSize,
          height: size,
          overflow: 'hidden',
        }}
      >
        {clamped > 0 ? (
          <View
            style={{
              width: size,
              height: size,
              borderRadius: halfSize,
              borderWidth: strokeWidth,
              borderColor: 'transparent',
              borderTopColor: activeColor,
              borderRightColor: activeColor,
              position: 'absolute',
              right: 0,
              transform: [{ rotate: `${rightDeg}deg` }],
            }}
          />
        ) : null}
      </View>

      {/* Left Half Clip */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: halfSize,
          height: size,
          overflow: 'hidden',
        }}
      >
        {clamped > 50 ? (
          <View
            style={{
              width: size,
              height: size,
              borderRadius: halfSize,
              borderWidth: strokeWidth,
              borderColor: 'transparent',
              borderBottomColor: activeColor,
              borderLeftColor: activeColor,
              position: 'absolute',
              left: 0,
              transform: [{ rotate: `${leftDeg}deg` }],
            }}
          />
        ) : null}
      </View>

      {/* Center Hub */}
      <View
        style={{
          width: innerSize,
          height: innerSize,
          borderRadius: innerSize / 2,
          backgroundColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
      </View>
    </View>
  );
}

export interface TeammateCircleChartProps {
  teammates: DashboardTeammateWorkloadItem[];
  totalTasks: number;
  completedTasks: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Teammate-wise Circle Chart + Working Load & Completed Tasks Breakdown
 * for the Comprehensive Workspace Report.
 */
export function TeammateCircleChart({
  teammates,
  totalTasks,
  completedTasks,
  style,
  testID = 'report-teammate-circle-chart',
}: TeammateCircleChartProps) {
  const safeTotal = Math.max(0, totalTasks);
  const safeCompleted = Math.min(Math.max(0, completedTasks), safeTotal);
  const activeLoadTotal = Math.max(0, safeTotal - safeCompleted);
  const overallCompletionPct =
    safeTotal > 0 ? Math.round((safeCompleted / safeTotal) * 100) : 0;

  return (
    <View
      testID={testID}
      accessible={true}
      accessibilityLabel={`Teammate workload circle chart: ${teammates.length} teammates, ${safeCompleted} of ${safeTotal} tasks completed`}
      style={[styles.container, style]}
    >
      {/* Top Row: Master Circle Chart + Teammate Workload Share Legend */}
      <View style={styles.circleHeroRow}>
        <View style={styles.masterCircleWrap}>
          {/* Outer Completion Ring + Inner Active Workload Ring */}
          <CircularDonutGauge
            percent={overallCompletionPct}
            size={124}
            strokeWidth={12}
            activeColor={colors.brandMint}
            trackColor={colors.primaryLight}
          >
            <View style={styles.circleCenterContent}>
              <Text style={styles.circleCenterValue}>{overallCompletionPct}%</Text>
              <Text style={styles.circleCenterLabel}>DONE</Text>
              <Text style={styles.circleCenterSub}>
                {safeCompleted}/{safeTotal} tasks
              </Text>
            </View>
          </CircularDonutGauge>

          <View style={styles.circleSummaryPills}>
            <View style={styles.miniSummaryPill}>
              <View style={[styles.legendDot, { backgroundColor: colors.brandMint }]} />
              <Text style={styles.miniSummaryText}>Done: {safeCompleted}</Text>
            </View>
            <View style={styles.miniSummaryPill}>
              <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
              <Text style={styles.miniSummaryText}>Load: {activeLoadTotal}</Text>
            </View>
          </View>
        </View>

        {/* Teammate Share Distribution Legend */}
        <View style={styles.shareLegendCol}>
          <Text style={styles.shareLegendHeader}>TEAMMATE TASK SHARE</Text>
          {teammates.length === 0 ? (
            <Text style={styles.emptyLegendText}>No teammates or tasks assigned yet.</Text>
          ) : (
            teammates.map((tm, idx) => {
              const color = getTeammateColor(idx, tm.userId);
              return (
                <View key={tm.userId} style={styles.shareLegendRow}>
                  <View style={styles.shareLegendLeft}>
                    <View style={[styles.legendDot, { backgroundColor: color }]} />
                    <Text style={styles.shareLegendName} numberOfLines={1}>
                      {tm.displayName}
                    </Text>
                  </View>
                  <Text style={styles.shareLegendCount}>
                    {tm.totalTasks} ({tm.workloadSharePercent}%)
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </View>

      {/* Teammate-Wise Circle Gauges + Working Load & Completed Breakdown */}
      {teammates.length > 0 ? (
        <View style={styles.teammateCardsList}>
          <Text style={styles.sectionSubHeader}>
            TEAMMATE WORKING LOAD & COMPLETED BREAKDOWN
          </Text>
          {teammates.map((tm, idx) => {
            const accentColor = getTeammateColor(idx, tm.userId);
            const tmTotal = Math.max(0, tm.totalTasks);

            return (
              <View
                key={tm.userId}
                testID={`teammate-workload-row-${tm.userId}`}
                style={styles.teammateCard}
              >
                <View style={styles.teammateTopRow}>
                  {/* Individual Teammate Circle Chart */}
                  <CircularDonutGauge
                    percent={tm.completionPercent}
                    size={58}
                    strokeWidth={6}
                    activeColor={
                      tm.completionPercent === 100 && tm.totalTasks > 0
                        ? colors.brandMint
                        : accentColor
                    }
                    trackColor={colors.surfaceHover}
                  >
                    <Text style={styles.teammateCirclePct}>{tm.completionPercent}%</Text>
                  </CircularDonutGauge>

                  {/* Teammate Identity & Load Counters */}
                  <View style={styles.teammateInfoCol}>
                    <View style={styles.teammateNameRow}>
                      <Text style={styles.teammateName} numberOfLines={1}>
                        {tm.displayName}
                      </Text>
                      {tm.roleLabel ? (
                        <Badge
                          label={tm.roleLabel}
                          variant={tm.userId === 'unassigned' ? 'default' : 'primary'}
                          size="sm"
                        />
                      ) : null}
                    </View>

                    {/* Primary Working Load + Completed Highlight Pills */}
                    <View style={styles.loadHighlightRow}>
                      <View style={styles.completedPill}>
                        <Text style={styles.completedPillText}>
                          Completed: {tm.completedTasks}/{tm.totalTasks}
                        </Text>
                      </View>
                      <View style={styles.workingLoadPill}>
                        <Text style={styles.workingLoadPillText}>
                          Working Load: {tm.activeWorkloadTasks}
                        </Text>
                      </View>
                      {tm.overdueTasks > 0 ? (
                        <View style={styles.overdueLoadPill}>
                          <Text style={styles.overdueLoadPillText}>
                            Overdue: {tm.overdueTasks}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>

                {/* Proportional Workload Bar for this Teammate */}
                <View style={styles.tmBarTrack}>
                  {tmTotal === 0 ? (
                    <View style={styles.tmBarEmpty} />
                  ) : (
                    <>
                      {tm.completedTasks > 0 ? (
                        <View
                          style={[
                            styles.tmBarSegment,
                            {
                              flex: tm.completedTasks / tmTotal,
                              backgroundColor: colors.brandMint,
                            },
                          ]}
                        />
                      ) : null}
                      {tm.inProgressTasks > 0 ? (
                        <View
                          style={[
                            styles.tmBarSegment,
                            {
                              flex: tm.inProgressTasks / tmTotal,
                              backgroundColor: colors.primary,
                            },
                          ]}
                        />
                      ) : null}
                      {tm.inReviewTasks > 0 ? (
                        <View
                          style={[
                            styles.tmBarSegment,
                            {
                              flex: tm.inReviewTasks / tmTotal,
                              backgroundColor: colors.info,
                            },
                          ]}
                        />
                      ) : null}
                      {tm.todoTasks > 0 ? (
                        <View
                          style={[
                            styles.tmBarSegment,
                            {
                              flex: tm.todoTasks / tmTotal,
                              backgroundColor: colors.textMuted,
                            },
                          ]}
                        />
                      ) : null}
                    </>
                  )}
                </View>

                {/* Granular Status Counters */}
                <View style={styles.tmBreakdownRow}>
                  <Text style={styles.tmBreakdownItem}>
                    Done: {tm.completedTasks}
                  </Text>
                  <Text style={styles.tmBreakdownItem}>
                    In Progress: {tm.inProgressTasks}
                  </Text>
                  <Text style={styles.tmBreakdownItem}>
                    Review: {tm.inReviewTasks}
                  </Text>
                  <Text style={styles.tmBreakdownItem}>
                    To Do: {tm.todoTasks}
                  </Text>
                  <Text style={styles.tmBreakdownShare}>
                    Share: {tm.workloadSharePercent}%
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  circleHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    padding: spacing.md,
  },
  masterCircleWrap: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  circleCenterContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleCenterValue: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  circleCenterLabel: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '800',
    color: colors.brandMint,
    letterSpacing: 0.8,
  },
  circleCenterSub: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 1,
  },
  circleSummaryPills: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: 2,
  },
  miniSummaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  miniSummaryText: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  shareLegendCol: {
    flex: 1,
    gap: 6,
  },
  shareLegendHeader: {
    ...typography.overline,
    color: colors.textMuted,
    fontSize: 10,
    marginBottom: 2,
  },
  emptyLegendText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  shareLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  shareLegendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  shareLegendName: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  shareLegendCount: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  teammateCardsList: {
    gap: spacing.sm,
  },
  sectionSubHeader: {
    ...typography.overline,
    color: colors.textMuted,
    marginBottom: 2,
  },
  teammateCard: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  teammateTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  teammateCirclePct: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  teammateInfoCol: {
    flex: 1,
    gap: 6,
  },
  teammateNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  teammateName: {
    ...typography.label,
    color: colors.textPrimary,
    flex: 1,
  },
  loadHighlightRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  completedPill: {
    backgroundColor: colors.brandMintBg,
    borderColor: colors.brandMintBorder,
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  completedPillText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
    color: colors.successText,
  },
  workingLoadPill: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryBorder,
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  workingLoadPillText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  overdueLoadPill: {
    backgroundColor: colors.dangerBg,
    borderColor: colors.dangerBorder,
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  overdueLoadPillText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
    color: colors.dangerText,
  },
  tmBarTrack: {
    height: 7,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceHover,
    flexDirection: 'row',
    overflow: 'hidden',
    gap: 2,
  },
  tmBarEmpty: {
    flex: 1,
    backgroundColor: colors.surfaceHover,
  },
  tmBarSegment: {
    height: '100%',
    borderRadius: radii.xs,
  },
  tmBreakdownRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.xs,
    paddingTop: 2,
  },
  tmBreakdownItem: {
    fontSize: 11,
    lineHeight: 15,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  tmBreakdownShare: {
    fontSize: 11,
    lineHeight: 15,
    color: colors.primary,
    fontWeight: '700',
  },
});

