import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorView,
  IconTile,
  LoadingView,
  ProgressBar,
  ScreenHeader,
  SectionHeader,
  StackedStatusChart,
  TabScreen,
  TeammateCircleChart,
} from '@/components/ui';
import { useAuth } from '@/features/auth';
import {
  DashboardProjectProgressItem,
  DashboardSummary,
  DashboardTeammateWorkloadItem,
  milestonesService,
} from '@/features/milestones';
import { colors, radii, shadows, spacing, touchTargets, typography } from '@/theme';

function getGreeting(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function getHealthBadge(
  health?: DashboardProjectProgressItem['healthStatus']
): { label: string; variant: 'success' | 'warning' | 'danger' | 'primary' } {
  switch (health) {
    case 'completed':
      return { label: 'Completed', variant: 'success' };
    case 'overdue':
      return { label: 'Overdue Risk', variant: 'danger' };
    case 'at_risk':
      return { label: 'Deadline Risk', variant: 'warning' };
    default:
      return { label: 'On Track', variant: 'primary' };
  }
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

  // Unified Project Report Modal + Scope Filter ('all' or specific projectId)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedReportProjectId, setSelectedReportProjectId] = useState<string>('all');

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
  const overdueTasksList = summary?.overdueTasks ?? [];
  const overdueTasksCount = overdueTasksList.length;
  const overdueMilestonesCount = upcomingMilestones.filter((m) => m.isOverdue).length;
  const totalOverdueCount = overdueTasksCount + overdueMilestonesCount;

  const activeProjectsCount = summary?.activeProjectCount ?? 0;
  const totalTasksCount = summary?.totalTasksCount ?? 0;
  const completedTasksCount = summary?.completedTasksCount ?? 0;
  const overallProgressPercent = summary?.overallTaskProgressPercent ?? 0;

  // Fallback status breakdown when mock or initial state doesn't include explicit statusBreakdown
  const pendingCount = Math.max(0, totalTasksCount - completedTasksCount);
  const statusBreakdown = summary?.statusBreakdown ?? {
    done: completedTasksCount,
    in_progress: assignedTasks.filter((t) => t.status === 'in_progress').length,
    in_review: assignedTasks.filter((t) => t.status === 'in_review').length,
    todo: Math.max(
      0,
      pendingCount -
        assignedTasks.filter((t) => t.status === 'in_progress' || t.status === 'in_review').length
    ),
  };

  const priorityBreakdown = summary?.priorityBreakdown ?? {
    urgent: assignedTasks.filter((t) => t.priority === 'urgent').length,
    high: assignedTasks.filter((t) => t.priority === 'high').length,
    medium: assignedTasks.filter((t) => t.priority === 'medium').length,
    low: assignedTasks.filter((t) => t.priority === 'low').length,
  };

  const chartSegments = [
    {
      key: 'done',
      label: 'Done',
      count: statusBreakdown.done,
      color: colors.brandMint,
    },
    {
      key: 'in_progress',
      label: 'In Progress',
      count: statusBreakdown.in_progress,
      color: colors.primary,
    },
    {
      key: 'in_review',
      label: 'In Review',
      count: statusBreakdown.in_review,
      color: colors.brandAzure,
    },
    {
      key: 'todo',
      label: 'To Do',
      count: statusBreakdown.todo,
      color: colors.borderMuted,
    },
  ];

  const prioritySegments = [
    {
      key: 'urgent',
      label: 'Urgent',
      count: priorityBreakdown.urgent,
      color: colors.danger,
    },
    {
      key: 'high',
      label: 'High',
      count: priorityBreakdown.high,
      color: colors.warning,
    },
    {
      key: 'medium',
      label: 'Medium',
      count: priorityBreakdown.medium,
      color: colors.primary,
    },
    {
      key: 'low',
      label: 'Low',
      count: priorityBreakdown.low,
      color: colors.brandMint,
    },
  ];

  const projectProgressList = summary?.projectProgress ?? [];

  // Scoped metrics inside the Full Project Report Modal
  const selectedProjectReport =
    selectedReportProjectId === 'all'
      ? null
      : projectProgressList.find((p) => p.projectId === selectedReportProjectId) ?? null;

  const reportTotalTasks = selectedProjectReport
    ? selectedProjectReport.totalTasks
    : totalTasksCount;
  const reportCompletedTasks = selectedProjectReport
    ? selectedProjectReport.completedTasks
    : completedTasksCount;
  const reportProgressPercent = selectedProjectReport
    ? selectedProjectReport.progressPercent
    : overallProgressPercent;
  const reportOverdueTasks = selectedProjectReport
    ? selectedProjectReport.overdueTasks
    : totalOverdueCount;

  const reportChartSegments = selectedProjectReport
    ? [
        {
          key: 'done',
          label: 'Done',
          count: selectedProjectReport.completedTasks,
          color: colors.brandMint,
        },
        {
          key: 'in_progress',
          label: 'Active / Review',
          count: selectedProjectReport.inProgressTasks,
          color: colors.primary,
        },
        {
          key: 'todo',
          label: 'To Do',
          count:
            selectedProjectReport.todoTasks ??
            Math.max(
              0,
              selectedProjectReport.totalTasks -
                selectedProjectReport.completedTasks -
                selectedProjectReport.inProgressTasks
            ),
          color: colors.borderMuted,
        },
      ]
    : chartSegments;

  const reportMilestones =
    selectedReportProjectId === 'all'
      ? upcomingMilestones
      : upcomingMilestones.filter((m) => m.project_id === selectedReportProjectId);
  const reportMeetings =
    selectedReportProjectId === 'all'
      ? upcomingMeetings
      : upcomingMeetings.filter((m) => m.project_id === selectedReportProjectId);
  const reportDecisions =
    selectedReportProjectId === 'all'
      ? recentDecisions
      : recentDecisions.filter((d) => d.project_id === selectedReportProjectId);

  const rawTeammates = selectedProjectReport
    ? selectedProjectReport.teammateWorkloads
    : summary?.teammateWorkloads;

  const reportTeammates: DashboardTeammateWorkloadItem[] =
    rawTeammates && rawTeammates.length > 0
      ? rawTeammates
      : reportTotalTasks > 0
        ? [
            {
              userId: user?.id ?? 'user-current',
              displayName: displayName || 'You',
              roleLabel: 'You',
              totalTasks: reportCompletedTasks + assignedTasks.length,
              completedTasks: reportCompletedTasks,
              inProgressTasks: assignedTasks.filter((t) => t.status === 'in_progress').length,
              inReviewTasks: assignedTasks.filter((t) => t.status === 'in_review').length,
              todoTasks: assignedTasks.filter((t) => t.status === 'todo').length,
              overdueTasks: assignedTasks.filter((t) => t.isOverdue).length,
              activeWorkloadTasks: assignedTasks.length,
              completionPercent:
                reportCompletedTasks + assignedTasks.length > 0
                  ? Math.round(
                      (reportCompletedTasks /
                        (reportCompletedTasks + assignedTasks.length)) *
                        100
                    )
                  : 0,
              workloadSharePercent:
                reportTotalTasks > 0
                  ? Math.round(
                      ((reportCompletedTasks + assignedTasks.length) / reportTotalTasks) * 100
                    )
                  : 0,
            },
          ]
        : [];

  return (
    <TabScreen
      refreshing={isRefreshing}
      onRefresh={isConfigured && user ? handleRefresh : undefined}
    >
      <ScreenHeader
        eyebrow={dateLabel}
        title={firstName ? `${getGreeting(now)}, ${firstName}` : 'Welcome to MelBond'}
        subtitle="One project, one organized student workspace."
        accessory={<Avatar name={displayName} avatarUrl={profile?.avatar_url} size={48} />}
      />

      {errorMessage ? (
        <ErrorView
          title="Could not sync dashboard"
          message={errorMessage}
          onRetry={loadDashboard}
          style={styles.errorBanner}
        />
      ) : null}

      {/* Authoritative Workspace Pulse, Charts & Unified Report Card */}
      {summary && summary.activeProjectCount > 0 ? (
        <Card style={styles.overviewCard} variant="elevated">
          <View style={styles.overviewAccentBar} />
          <View style={styles.overviewHeader}>
            <View style={styles.overviewHeaderLeft}>
              <View style={styles.overviewPulseRow}>
                <View style={styles.overviewPulseDot} />
                <Text style={styles.overviewEyebrow}>WORKSPACE PULSE & REPORT</Text>
              </View>
              <Text style={styles.overviewTitle}>
                {`${activeProjectsCount} ${
                  activeProjectsCount === 1 ? 'Active Workspace' : 'Active Workspaces'
                }`}
              </Text>
            </View>
            <Badge
              label={`${overallProgressPercent}% Complete`}
              variant={
                overallProgressPercent === 100 && totalTasksCount > 0 ? 'success' : 'primary'
              }
            />
          </View>

          {/* Master Completion Progress Bar */}
          <ProgressBar
            value={completedTasksCount}
            total={totalTasksCount}
            label="Overall workspace tasks progress"
            tone={overallProgressPercent === 100 && totalTasksCount > 0 ? 'success' : 'primary'}
            height={10}
          />

          <View style={styles.statsRow}>
            <Text style={styles.statText}>
              {completedTasksCount}/{totalTasksCount} tasks done
            </Text>
            {totalOverdueCount > 0 ? (
              <Badge
                label={`${totalOverdueCount} Overdue`}
                variant="danger"
                size="sm"
                icon={<Ionicons name="alert-circle" size={12} color={colors.dangerText} />}
              />
            ) : (
              <Text style={styles.statMutedText}>
                {upcomingMilestones.length} active milestone
                {upcomingMilestones.length === 1 ? '' : 's'}
              </Text>
            )}
          </View>

          {/* 4-Column KPI Metric Strip */}
          <View style={styles.kpiGrid}>
            <View style={styles.kpiTile}>
              <Text style={styles.kpiValue}>{activeProjectsCount}</Text>
              <Text style={styles.kpiLabel}>Workspaces</Text>
            </View>
            <View style={styles.kpiTile}>
              <Text style={[styles.kpiValue, { color: colors.brandMint }]}>
                {completedTasksCount}
              </Text>
              <Text style={styles.kpiLabel}>Completed</Text>
            </View>
            <View style={styles.kpiTile}>
              <Text style={[styles.kpiValue, { color: colors.primary }]}>
                {assignedTasks.length}
              </Text>
              <Text style={styles.kpiLabel}>My Queue</Text>
            </View>
            <View style={styles.kpiTile}>
              <Text
                style={[
                  styles.kpiValue,
                  { color: totalOverdueCount > 0 ? colors.dangerText : colors.textPrimary },
                ]}
              >
                {totalOverdueCount}
              </Text>
              <Text style={styles.kpiLabel}>Overdue</Text>
            </View>
          </View>

          {/* Stacked Distribution Chart & Horizontal Bars */}
          <View style={styles.chartSection}>
            <View style={styles.chartHeaderRow}>
              <Text style={styles.chartTitle}>Task Distribution Graph</Text>
              <Text style={styles.chartSubtitle}>{totalTasksCount} total deliverables</Text>
            </View>
            <StackedStatusChart segments={chartSegments} total={totalTasksCount} />
          </View>

          {/* Per-Project Progress Bars */}
          {projectProgressList.length > 0 ? (
            <View style={styles.projectProgressSection}>
              <Text style={styles.chartTitle}>Workspace Completion Breakdown</Text>
              {projectProgressList.slice(0, 4).map((proj) => {
                const healthBadge = getHealthBadge(proj.healthStatus);
                return (
                  <View key={proj.projectId} style={styles.projectProgressRow}>
                    <View style={styles.projectProgressLabelRow}>
                      <Text style={styles.projectProgressName} numberOfLines={1}>
                        {proj.projectName}
                        {proj.courseCode ? ` (${proj.courseCode})` : ''}
                      </Text>
                      <View style={styles.projectProgressBadgeGroup}>
                        <Badge
                          label={healthBadge.label}
                          variant={healthBadge.variant}
                          size="sm"
                        />
                        <Text style={styles.projectProgressMeta}>
                          {proj.completedTasks}/{proj.totalTasks} ({proj.progressPercent}%)
                        </Text>
                      </View>
                    </View>
                    <ProgressBar
                      value={proj.completedTasks}
                      total={proj.totalTasks}
                      label={`${proj.projectName} progress`}
                      tone={
                        proj.progressPercent === 100 && proj.totalTasks > 0
                          ? 'success'
                          : 'primary'
                      }
                      height={6}
                    />
                  </View>
                );
              })}
            </View>
          ) : null}

          {/* Open Unified Full Project Report Action */}
          <View style={styles.reportButtonWrap}>
            <Button
              testID="open-project-report-button"
              title="Open Full Project Report"
              variant="soft"
              size="md"
              leftIcon={<Ionicons name="stats-chart" size={18} color={colors.primaryDark} />}
              rightIcon={
                <Ionicons name="expand-outline" size={16} color={colors.primaryDark} />
              }
              onPress={() => {
                setSelectedReportProjectId('all');
                setIsReportModalOpen(true);
              }}
              accessibilityLabel="Open Full Project Report"
            />
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

      {/* Upcoming Milestones Section with individual ProgressBar */}
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
                  styles.milestoneRow,
                  idx > 0 && styles.itemDivider,
                  pressed && styles.itemRowPressed,
                ]}
              >
                <View style={styles.milestoneTopRow}>
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
                </View>

                <View style={styles.milestoneBarWrap}>
                  <ProgressBar
                    value={milestone.progressPercent}
                    total={100}
                    label={`Milestone ${milestone.title} progress`}
                    tone={milestone.progressPercent === 100 ? 'success' : 'primary'}
                    height={6}
                  />
                </View>
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

      {/* Single-View Comprehensive Project Report Modal */}
      <Modal
        visible={isReportModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsReportModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet} testID="full-project-report-modal">
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleCol}>
                <Text style={styles.modalEyebrow}>COMPREHENSIVE WORKSPACE REPORT</Text>
                <Text style={styles.modalTitle} accessibilityRole="header">
                  {selectedProjectReport
                    ? selectedProjectReport.projectName
                    : 'All Active Workspaces Report'}
                </Text>
              </View>
              <Pressable
                hitSlop={10}
                onPress={() => setIsReportModalOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Close project report"
              >
                <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Scope Selector Chips (All Workspaces vs Individual Project) */}
            {projectProgressList.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.reportScopeRow}
              >
                <Pressable
                  onPress={() => setSelectedReportProjectId('all')}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedReportProjectId === 'all' }}
                  accessibilityLabel="View report for all workspaces"
                  style={[
                    styles.scopeChip,
                    selectedReportProjectId === 'all' && styles.scopeChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.scopeChipText,
                      selectedReportProjectId === 'all' && styles.scopeChipTextActive,
                    ]}
                  >
                    All Workspaces ({activeProjectsCount})
                  </Text>
                </Pressable>
                {projectProgressList.map((proj) => {
                  const isSelected = selectedReportProjectId === proj.projectId;
                  return (
                    <Pressable
                      key={proj.projectId}
                      onPress={() => setSelectedReportProjectId(proj.projectId)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={`View report for ${proj.projectName}`}
                      style={[styles.scopeChip, isSelected && styles.scopeChipActive]}
                    >
                      <Text
                        style={[
                          styles.scopeChipText,
                          isSelected && styles.scopeChipTextActive,
                        ]}
                      >
                        {proj.projectName}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
            >
              {/* 1. Executive Health & Completion Status Card */}
              <Card style={styles.reportCard} variant="elevated">
                <View style={styles.reportSectionTop}>
                  <View>
                    <Text style={styles.reportCardTitle}>Overall Delivery Status</Text>
                    <Text style={styles.reportCardSub}>
                      {reportCompletedTasks} of {reportTotalTasks} deliverables completed
                    </Text>
                  </View>
                  <Badge
                    label={
                      selectedProjectReport
                        ? getHealthBadge(selectedProjectReport.healthStatus).label
                        : reportOverdueTasks > 0
                          ? `${reportOverdueTasks} Overdue`
                          : 'On Track'
                    }
                    variant={
                      selectedProjectReport
                        ? getHealthBadge(selectedProjectReport.healthStatus).variant
                        : reportOverdueTasks > 0
                          ? 'danger'
                          : 'success'
                    }
                  />
                </View>

                <ProgressBar
                  value={reportCompletedTasks}
                  total={reportTotalTasks}
                  label="Report overall completion progress"
                  tone={
                    reportProgressPercent === 100 && reportTotalTasks > 0
                      ? 'success'
                      : 'primary'
                  }
                  height={10}
                />

                <View style={styles.kpiGrid}>
                  <View style={styles.kpiTile}>
                    <Text style={[styles.kpiValue, { color: colors.brandMint }]}>
                      {reportProgressPercent}%
                    </Text>
                    <Text style={styles.kpiLabel}>Completion</Text>
                  </View>
                  <View style={styles.kpiTile}>
                    <Text style={[styles.kpiValue, { color: colors.primary }]}>
                      {reportMilestones.length}
                    </Text>
                    <Text style={styles.kpiLabel}>Milestones</Text>
                  </View>
                  <View style={styles.kpiTile}>
                    <Text style={styles.kpiValue}>{reportMeetings.length}</Text>
                    <Text style={styles.kpiLabel}>Meetings</Text>
                  </View>
                  <View style={styles.kpiTile}>
                    <Text style={styles.kpiValue}>{reportDecisions.length}</Text>
                    <Text style={styles.kpiLabel}>Decisions</Text>
                  </View>
                </View>
              </Card>

              {/* 2. Teammate-Wise Circle Chart, Working Load & Completed Tasks */}
              <Card style={styles.reportCard}>
                <Text style={styles.reportCardTitle}>
                  Teammate Circle Chart & Working Load
                </Text>
                <Text style={styles.reportCardSub}>
                  Circular completion gauge, active working load, and completed tasks per teammate
                </Text>
                <TeammateCircleChart
                  testID="report-teammate-circle-chart"
                  teammates={reportTeammates}
                  totalTasks={reportTotalTasks}
                  completedTasks={reportCompletedTasks}
                />
              </Card>

              {/* 3. Task Status Distribution Chart */}
              <Card style={styles.reportCard}>
                <Text style={styles.reportCardTitle}>Task Status Breakdown Chart</Text>
                <Text style={styles.reportCardSub}>
                  Proportional distribution across workflow stages
                </Text>
                <StackedStatusChart
                  testID="report-status-chart"
                  segments={reportChartSegments}
                  total={reportTotalTasks}
                />
              </Card>

              {/* 3. Task Priority Distribution Graph (when viewing All Workspaces) */}
              {selectedReportProjectId === 'all' ? (
                <Card style={styles.reportCard}>
                  <Text style={styles.reportCardTitle}>Priority & Urgency Graph</Text>
                  <Text style={styles.reportCardSub}>
                    Deliverables grouped by priority level
                  </Text>
                  <StackedStatusChart
                    testID="report-priority-chart"
                    title="Task Priority Distribution"
                    segments={prioritySegments}
                    total={totalTasksCount}
                  />
                </Card>
              ) : null}

              {/* 4. Per-Project Health Matrix */}
              {projectProgressList.length > 0 ? (
                <Card style={styles.reportCard}>
                  <Text style={styles.reportCardTitle}>Project Health & Status Matrix</Text>
                  <Text style={styles.reportCardSub}>
                    Side-by-side status, milestones, and completion across workspaces
                  </Text>
                  {projectProgressList
                    .filter((p) =>
                      selectedReportProjectId === 'all'
                        ? true
                        : p.projectId === selectedReportProjectId
                    )
                    .map((proj) => {
                      const badge = getHealthBadge(proj.healthStatus);
                      return (
                        <Pressable
                          key={proj.projectId}
                          accessibilityRole="button"
                          accessibilityLabel={`Open workspace ${proj.projectName} from report`}
                          onPress={() => {
                            setIsReportModalOpen(false);
                            router.push(`/projects/${proj.projectId}` as Href);
                          }}
                          style={styles.matrixCard}
                        >
                          <View style={styles.matrixHeader}>
                            <View style={styles.matrixTitleCol}>
                              <Text style={styles.matrixProjectName} numberOfLines={1}>
                                {proj.projectName}
                              </Text>
                              <Text style={styles.matrixCourseMeta}>
                                {[proj.courseCode, proj.semester]
                                  .filter(Boolean)
                                  .join(' • ') || 'Student Workspace'}
                              </Text>
                            </View>
                            <Badge label={badge.label} variant={badge.variant} size="sm" />
                          </View>

                          <ProgressBar
                            value={proj.completedTasks}
                            total={proj.totalTasks}
                            label={`${proj.projectName} report progress`}
                            tone={
                              proj.progressPercent === 100 && proj.totalTasks > 0
                                ? 'success'
                                : 'primary'
                            }
                            height={8}
                          />

                          <View style={styles.matrixMetricsRow}>
                            <Text style={styles.matrixMetricChip}>
                              Tasks: {proj.completedTasks}/{proj.totalTasks} (
                              {proj.progressPercent}%)
                            </Text>
                            <Text style={styles.matrixMetricChip}>
                              In Progress: {proj.inProgressTasks}
                            </Text>
                            <Text
                              style={[
                                styles.matrixMetricChip,
                                proj.overdueTasks > 0 && { color: colors.dangerText },
                              ]}
                            >
                              Overdue: {proj.overdueTasks}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                </Card>
              ) : null}

              {/* 5. Milestones & Decisions Snapshot */}
              <Card style={styles.reportCard}>
                <Text style={styles.reportCardTitle}>Milestones & Governance Snapshot</Text>
                <Text style={styles.reportCardSub}>
                  Active checkpoints ({reportMilestones.length}) and logged decisions (
                  {reportDecisions.length})
                </Text>
                {reportMilestones.length === 0 && reportDecisions.length === 0 ? (
                  <Text style={styles.statMutedText}>
                    No active milestones or decisions recorded in this scope yet.
                  </Text>
                ) : (
                  <View style={styles.snapshotList}>
                    {reportMilestones.slice(0, 4).map((ms) => (
                      <View key={ms.id} style={styles.snapshotRow}>
                        <View style={styles.snapshotTop}>
                          <Text style={styles.snapshotTitle} numberOfLines={1}>
                            [Milestone] {ms.title}
                          </Text>
                          <Badge
                            label={
                              ms.isOverdue
                                ? 'Overdue'
                                : ms.hasDeadlineRisk
                                  ? 'At Risk'
                                  : `${ms.progressPercent}%`
                            }
                            variant={
                              ms.isOverdue
                                ? 'danger'
                                : ms.hasDeadlineRisk
                                  ? 'warning'
                                  : 'primary'
                            }
                            size="sm"
                          />
                        </View>
                        <ProgressBar
                          value={ms.progressPercent}
                          total={100}
                          label={`Report milestone ${ms.title}`}
                          height={5}
                        />
                      </View>
                    ))}
                    {reportDecisions.slice(0, 3).map((dec) => (
                      <View key={dec.id} style={styles.snapshotDecisionRow}>
                        <Ionicons
                          name="git-pull-request-outline"
                          size={15}
                          color={colors.primary}
                        />
                        <Text style={styles.snapshotTitle} numberOfLines={1}>
                          [Decision] {dec.title}
                        </Text>
                        <Badge
                          label={dec.status.toUpperCase()}
                          variant={dec.status === 'accepted' ? 'success' : 'info'}
                          size="sm"
                        />
                      </View>
                    ))}
                  </View>
                )}
              </Card>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                title="Close Report"
                variant="primary"
                size="md"
                onPress={() => setIsReportModalOpen(false)}
              />
            </View>
          </View>
        </View>
      </Modal>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  errorBanner: {
    marginBottom: spacing.base,
  },
  overviewCard: {
    padding: spacing.base,
    gap: spacing.md,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  overviewAccentBar: {
    height: 4,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    marginBottom: -spacing.xs,
  },
  overviewPulseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  overviewPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.brandMint,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overviewHeaderLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  overviewEyebrow: {
    ...typography.overline,
    color: colors.primary,
  },
  overviewTitle: {
    ...typography.titleMedium,
    color: colors.textPrimary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: -spacing.xs,
  },
  statText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  statMutedText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  kpiTile: {
    flex: 1,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  kpiValue: {
    ...typography.titleMedium,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  kpiLabel: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  chartSection: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    gap: spacing.sm,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chartTitle: {
    ...typography.label,
    color: colors.textPrimary,
  },
  chartSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
  },
  projectProgressSection: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    gap: spacing.sm,
  },
  projectProgressRow: {
    gap: 6,
  },
  projectProgressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.xs,
  },
  projectProgressBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  projectProgressName: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  projectProgressMeta: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
  },
  reportButtonWrap: {
    paddingTop: spacing.xs,
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
  milestoneRow: {
    padding: spacing.sm,
    minHeight: touchTargets.minTouchSize,
    gap: spacing.xs,
  },
  milestoneTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  milestoneBarWrap: {
    paddingLeft: 36 + spacing.sm,
    paddingTop: 2,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    paddingTop: spacing.base,
    maxHeight: '92%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    marginBottom: spacing.sm,
  },
  modalTitleCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  modalEyebrow: {
    ...typography.overline,
    color: colors.primary,
  },
  modalTitle: {
    ...typography.titleLarge,
    color: colors.textPrimary,
  },
  reportScopeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
  },
  scopeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scopeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  scopeChipText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  scopeChipTextActive: {
    color: colors.surface,
  },
  modalScroll: {
    paddingHorizontal: spacing.base,
  },
  modalScrollContent: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  reportCard: {
    padding: spacing.base,
    gap: spacing.sm,
  },
  reportSectionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  reportCardTitle: {
    ...typography.titleSmall,
    color: colors.textPrimary,
  },
  reportCardSub: {
    ...typography.caption,
    color: colors.textMuted,
  },
  matrixCard: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  matrixHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.xs,
  },
  matrixTitleCol: {
    flex: 1,
  },
  matrixProjectName: {
    ...typography.label,
    color: colors.textPrimary,
  },
  matrixCourseMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  matrixMetricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: 2,
  },
  matrixMetricChip: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  snapshotList: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  snapshotRow: {
    gap: 4,
  },
  snapshotTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.xs,
  },
  snapshotDecisionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: 4,
  },
  snapshotTitle: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  modalFooter: {
    padding: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.surface,
  },
});
