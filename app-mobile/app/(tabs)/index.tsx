import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  ErrorView,
  IconTile,
  LoadingView,
  ProgressBar,
  ScreenHeader,
  SectionHeader,
  TabScreen,
} from '@/components/ui';
import { useAuth } from '@/features/auth';
import { DashboardSummary, milestonesService } from '@/features/milestones';
import { colors, radii, shadows, spacing, touchTargets, typography } from '@/theme';

function getGreeting(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

interface QuickActionProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  accessibilityLabel: string;
  onPress: () => void;
}

function QuickAction({ icon, title, description, accessibilityLabel, onPress }: QuickActionProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.quickAction, pressed && styles.quickActionPressed]}
    >
      <IconTile name={icon} tone="primary" size={40} />
      <Text style={styles.quickActionTitle}>{title}</Text>
      <Text style={styles.quickActionDesc} numberOfLines={2}>
        {description}
      </Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { profile, user, isConfigured } = useAuth();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(
    Boolean(isConfigured && user && milestonesService?.fetchDashboardSummary)
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!isConfigured || !user || !milestonesService?.fetchDashboardSummary) {
      setSummary(null);
      setErrorMessage(null);
      setIsLoading(false);
      return;
    }

    setErrorMessage(null);
    const { data, error } = await milestonesService.fetchDashboardSummary(user.id);
    if (error) {
      setErrorMessage(error.message);
    } else if (data) {
      setSummary(data);
    }
    setIsLoading(false);
  }, [isConfigured, user]);

  useEffect(() => {
    if (!isConfigured || !user || !milestonesService?.fetchDashboardSummary) {
      return;
    }

    let isMounted = true;
    (async () => {
      const { data, error } = await milestonesService.fetchDashboardSummary(user.id);
      if (!isMounted) return;
      if (error) {
        setErrorMessage(error.message);
      } else if (data) {
        setSummary(data);
      }
      setIsLoading(false);
    })();

    return () => {
      isMounted = false;
    };
  }, [isConfigured, user]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDashboard();
    setIsRefreshing(false);
  };

  if (isLoading && !isRefreshing) {
    return <LoadingView message="Loading dashboard..." />;
  }

  const now = new Date();
  const firstName = profile?.full_name?.trim().split(/\s+/)[0];
  const displayName = profile?.full_name ?? user?.email ?? 'MelBond Student';
  const dateLabel = now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const assignedTasks = summary?.myAssignedTasks ?? [];
  const upcomingMilestones = summary?.upcomingMilestones ?? [];
  const upcomingMeetings = summary?.upcomingMeetings ?? [];
  const recentDecisions = summary?.recentDecisions ?? [];
  const overdueTasksCount = summary?.overdueTasks.length ?? 0;
  const overdueMilestonesCount = upcomingMilestones.filter((m) => m.isOverdue).length;

  return (
    <TabScreen
      refreshing={isRefreshing}
      onRefresh={isConfigured && user ? handleRefresh : undefined}
    >
      <ScreenHeader
        eyebrow={dateLabel}
        title={firstName ? `${getGreeting(now)}, ${firstName}` : 'Welcome to MelBond'}
        subtitle="One project, one organized student workspace."
        accessory={<Avatar name={displayName} size={48} />}
      />

      {errorMessage ? (
        <ErrorView
          title="Could not sync dashboard"
          message={errorMessage}
          onRetry={loadDashboard}
          style={styles.errorBanner}
        />
      ) : null}

      {/* Authoritative Workspace Overview Card (when user has active projects) */}
      {summary && summary.activeProjectCount > 0 ? (
        <Card style={styles.overviewCard} variant="elevated">
          <View style={styles.overviewHeader}>
            <View>
              <Text style={styles.overviewEyebrow}>WORKSPACE PULSE</Text>
              <Text style={styles.overviewTitle}>
                {`${summary.activeProjectCount} ${
                  summary.activeProjectCount === 1 ? 'Active Workspace' : 'Active Workspaces'
                }`}
              </Text>
            </View>
            <Badge
              label={`${summary.overallTaskProgressPercent}% Complete`}
              variant={summary.overallTaskProgressPercent === 100 ? 'success' : 'primary'}
            />
          </View>

          <ProgressBar
            value={summary.completedTasksCount}
            total={summary.totalTasksCount}
            label="Overall workspace tasks progress"
            tone={summary.overallTaskProgressPercent === 100 ? 'success' : 'primary'}
            height={8}
          />

          <View style={styles.statsRow}>
            <Text style={styles.statText}>
              {summary.completedTasksCount}/{summary.totalTasksCount} tasks done
            </Text>
            {(overdueTasksCount > 0 || overdueMilestonesCount > 0) ? (
              <Badge
                label={`${overdueTasksCount + overdueMilestonesCount} Overdue`}
                variant="danger"
                size="sm"
                icon={<Ionicons name="alert-circle" size={12} color={colors.dangerText} />}
              />
            ) : null}
          </View>
        </Card>
      ) : null}

      {/* Quick actions — both route to real, implemented flows */}
      <View style={styles.quickRow}>
        <QuickAction
          icon="add-circle-outline"
          title="New workspace"
          description="Start a project for your team"
          accessibilityLabel="Create a new workspace"
          onPress={() => router.push('/projects/new')}
        />
        <QuickAction
          icon="key-outline"
          title="Join with code"
          description="Use a teammate's invite code"
          accessibilityLabel="Join a workspace with an invitation code"
          onPress={() => router.push('/projects/join')}
        />
      </View>

      {/* Upcoming Tasks Section */}
      <SectionHeader
        title="Upcoming Tasks"
        meta={assignedTasks.length > 0 ? `${assignedTasks.length} assigned to you` : undefined}
      />
      {assignedTasks.length === 0 ? (
        <Card style={styles.emptyCard}>
          <EmptyState
            title="No tasks scheduled yet"
            description="Tasks assigned to you and upcoming milestone deadlines will appear here."
            icon={<Ionicons name="calendar-outline" size={36} color={colors.primary} />}
          />
        </Card>
      ) : (
        <Card style={styles.listCard}>
          {assignedTasks.slice(0, 5).map((task, idx) => (
            <Pressable
              key={task.id}
              accessibilityRole="button"
              accessibilityLabel={`Open task ${task.title}`}
              onPress={() =>
                router.push(`/projects/${task.project_id}/tasks/${task.id}` as Href)
              }
              style={({ pressed }) => [
                styles.itemRow,
                idx > 0 && styles.itemDivider,
                pressed && styles.itemRowPressed,
              ]}
            >
              <IconTile
                name={task.isOverdue ? 'alert-circle-outline' : 'checkbox-outline'}
                tone={task.isOverdue ? 'danger' : 'primary'}
                size={36}
              />
              <View style={styles.itemTextCol}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {task.title}
                </Text>
                <Text style={styles.itemSubtitle} numberOfLines={1}>
                  {task.projectName}
                  {task.due_date
                    ? ` • Due ${new Date(task.due_date).toLocaleDateString()}`
                    : ''}
                </Text>
              </View>
              <Badge
                label={task.isOverdue ? 'Overdue' : task.priority.toUpperCase()}
                variant={
                  task.isOverdue
                    ? 'danger'
                    : task.priority === 'urgent'
                      ? 'warning'
                      : 'default'
                }
                size="sm"
              />
            </Pressable>
          ))}
        </Card>
      )}

      {/* Upcoming Milestones Section (shown when milestones exist) */}
      {upcomingMilestones.length > 0 ? (
        <>
          <SectionHeader
            title="Upcoming Milestones"
            meta={`${upcomingMilestones.length} active`}
          />
          <Card style={styles.listCard}>
            {upcomingMilestones.slice(0, 4).map((milestone, idx) => (
              <Pressable
                key={milestone.id}
                accessibilityRole="button"
                accessibilityLabel={`Open milestone ${milestone.title}`}
                onPress={() =>
                  router.push(`/projects/${milestone.project_id}/milestones` as Href)
                }
                style={({ pressed }) => [
                  styles.itemRow,
                  idx > 0 && styles.itemDivider,
                  pressed && styles.itemRowPressed,
                ]}
              >
                <IconTile
                  name="flag-outline"
                  tone={
                    milestone.isOverdue
                      ? 'danger'
                      : milestone.hasDeadlineRisk
                        ? 'warning'
                        : 'primary'
                  }
                  size={36}
                />
                <View style={styles.itemTextCol}>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {milestone.title}
                  </Text>
                  <Text style={styles.itemSubtitle} numberOfLines={1}>
                    {milestone.projectName}
                    {milestone.target_date
                      ? ` • Target ${new Date(milestone.target_date).toLocaleDateString()}`
                      : ''}
                  </Text>
                </View>
                <Badge
                  label={
                    milestone.isOverdue
                      ? 'Overdue'
                      : milestone.hasDeadlineRisk
                        ? 'At Risk'
                        : `${milestone.progressPercent}%`
                  }
                  variant={
                    milestone.isOverdue
                      ? 'danger'
                      : milestone.hasDeadlineRisk
                        ? 'warning'
                        : 'primary'
                  }
                  size="sm"
                />
              </Pressable>
            ))}
          </Card>
        </>
      ) : null}

      {/* Upcoming Meetings Section (shown when scheduled meetings exist) */}
      {upcomingMeetings.length > 0 ? (
        <>
          <SectionHeader
            title="Next Team Meetings"
            meta={`${upcomingMeetings.length} scheduled`}
          />
          <Card style={styles.listCard}>
            {upcomingMeetings.slice(0, 3).map((mtg, idx) => (
              <Pressable
                key={mtg.id}
                accessibilityRole="button"
                accessibilityLabel={`Open meeting ${mtg.title}`}
                onPress={() =>
                  router.push(`/projects/${mtg.project_id}/meetings` as Href)
                }
                style={({ pressed }) => [
                  styles.itemRow,
                  idx > 0 && styles.itemDivider,
                  pressed && styles.itemRowPressed,
                ]}
              >
                <IconTile name="people-outline" tone="primary" size={36} />
                <View style={styles.itemTextCol}>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {mtg.title}
                  </Text>
                  <Text style={styles.itemSubtitle} numberOfLines={1}>
                    {mtg.projectName} • {new Date(mtg.starts_at).toLocaleDateString()}
                  </Text>
                </View>
                <Badge label="Scheduled" variant="primary" size="sm" />
              </Pressable>
            ))}
          </Card>
        </>
      ) : null}

      {/* Recent Decisions Section (shown when decisions exist) */}
      {recentDecisions.length > 0 ? (
        <>
          <SectionHeader
            title="Recent Decisions"
            meta={`${recentDecisions.length} active`}
          />
          <Card style={styles.listCard}>
            {recentDecisions.slice(0, 3).map((dec, idx) => (
              <Pressable
                key={dec.id}
                accessibilityRole="button"
                accessibilityLabel={`Open decision ${dec.title}`}
                onPress={() =>
                  router.push(`/projects/${dec.project_id}/decisions` as Href)
                }
                style={({ pressed }) => [
                  styles.itemRow,
                  idx > 0 && styles.itemDivider,
                  pressed && styles.itemRowPressed,
                ]}
              >
                <IconTile name="git-pull-request-outline" tone="primary" size={36} />
                <View style={styles.itemTextCol}>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {dec.title}
                  </Text>
                  <Text style={styles.itemSubtitle} numberOfLines={1}>
                    {dec.projectName}
                  </Text>
                </View>
                <Badge
                  label={dec.status === 'accepted' ? 'Accepted' : 'Proposed'}
                  variant={dec.status === 'accepted' ? 'success' : 'info'}
                  size="sm"
                />
              </Pressable>
            ))}
          </Card>
        </>
      ) : null}

      <Pressable
        onPress={() => router.push('/(tabs)/projects')}
        accessibilityRole="button"
        accessibilityLabel="Browse all workspaces"
        style={({ pressed }) => [styles.linkRow, pressed && styles.linkRowPressed]}
      >
        <IconTile name="folder-open-outline" tone="neutral" size={36} />
        <View style={styles.linkTextCol}>
          <Text style={styles.linkTitle}>Browse workspaces</Text>
          <Text style={styles.linkDesc}>Open a project to view tasks and phases</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </Pressable>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  errorBanner: {
    marginBottom: spacing.base,
  },
  overviewCard: {
    padding: spacing.base,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overviewEyebrow: {
    ...typography.overline,
    color: colors.primary,
    marginBottom: 2,
  },
  overviewTitle: {
    ...typography.titleMedium,
    color: colors.textPrimary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  quickRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  quickAction: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    minHeight: touchTargets.minTouchSize,
    ...shadows.subtle,
  },
  quickActionPressed: {
    backgroundColor: colors.surfaceSubtle,
    transform: [{ scale: 0.98 }],
  },
  quickActionTitle: {
    ...typography.label,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  quickActionDesc: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xxs,
  },
  emptyCard: {
    paddingVertical: spacing.xs,
    marginBottom: spacing.base,
  },
  listCard: {
    padding: spacing.xs,
    marginBottom: spacing.lg,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    minHeight: touchTargets.minTouchSize,
    gap: spacing.sm,
  },
  itemRowPressed: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.md,
  },
  itemDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  itemTextCol: {
    flex: 1,
  },
  itemTitle: {
    ...typography.label,
    color: colors.textPrimary,
  },
  itemSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: touchTargets.minTouchSize,
  },
  linkRowPressed: {
    backgroundColor: colors.surfaceSubtle,
  },
  linkTextCol: {
    flex: 1,
    marginLeft: spacing.md,
  },
  linkTitle: {
    ...typography.label,
    color: colors.textPrimary,
  },
  linkDesc: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xxs,
  },
});
