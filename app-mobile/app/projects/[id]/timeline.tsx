import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
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
  useToast,
} from '@/components/ui';
import { useAuth } from '@/features/auth';
import { formatMeetingDateTime, meetingsService, MeetingWithDetails } from '@/features/meetings';
import { milestonesService, MilestoneWithDetails } from '@/features/milestones';
import { playbooksService, ProjectPhase } from '@/features/playbooks';
import { projectsService, ProjectWithRole } from '@/features/projects';
import { tasksService, TaskWithDetails } from '@/features/tasks';
import { colors, radii, shadows, spacing, typography } from '@/theme';

export type TimelineViewMode = 'calendar' | 'roadmap';
export type TimelineFilter = 'all' | 'due_this_week' | 'overdue' | 'milestones' | 'tasks' | 'meetings';

export type UnifiedItemType = 'milestone' | 'task' | 'meeting';

export interface UnifiedTimelineItem {
  id: string;
  type: UnifiedItemType;
  title: string;
  dateKey: string; // YYYY-MM-DD
  timeDisplay?: string | null;
  status: string;
  priority?: string | null;
  assigneeName?: string | null;
  assigneeAvatar?: string | null;
  isCompleted: boolean;
  isOverdue: boolean;
  phaseTitle?: string | null;
  progressPercent?: number;
  rawTask?: TaskWithDetails;
  rawMilestone?: MilestoneWithDetails;
  rawMeeting?: MeetingWithDetails;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y ?? 2026, (m ?? 1) - 1, d ?? 1);
}

function formatDisplayDate(dateKey: string): string {
  const date = parseDateKey(dateKey);
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getCountdownLabel(dateKey: string, isCompleted: boolean): { label: string; tone: 'danger' | 'warning' | 'info' | 'success' | 'default' } {
  if (isCompleted) {
    return { label: 'Completed', tone: 'success' };
  }
  const todayKey = toDateKey(new Date());
  if (dateKey === todayKey) {
    return { label: 'Due Today', tone: 'danger' };
  }
  const target = parseDateKey(dateKey).getTime();
  const today = parseDateKey(todayKey).getTime();
  const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      label: overdueDays === 1 ? 'Overdue by 1 day' : `Overdue by ${overdueDays} days`,
      tone: 'danger',
    };
  }
  if (diffDays === 1) {
    return { label: 'Due Tomorrow', tone: 'warning' };
  }
  if (diffDays <= 7) {
    return { label: `In ${diffDays} days`, tone: 'warning' };
  }
  return { label: `In ${diffDays} days`, tone: 'info' };
}

export default function ProjectTimelineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();

  const [project, setProject] = useState<ProjectWithRole | null>(null);
  const [milestones, setMilestones] = useState<MilestoneWithDetails[]>([]);
  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [meetings, setMeetings] = useState<MeetingWithDetails[]>([]);
  const [phases, setPhases] = useState<ProjectPhase[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // View state
  const [viewMode, setViewMode] = useState<TimelineViewMode>('calendar');
  const [activeFilter, setActiveFilter] = useState<TimelineFilter>('all');

  // Calendar month state
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => toDateKey(today), [today]);
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0-indexed
  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayKey);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setErrorMessage(null);

    const [projRes, milestonesRes, tasksRes, meetingsRes, phasesRes] = await Promise.all([
      projectsService.fetchProjectDetails(id),
      milestonesService.fetchProjectMilestones(id),
      tasksService.fetchProjectTasks(id),
      meetingsService.fetchProjectMeetings(id),
      playbooksService.getProjectPhases(id),
    ]);

    if (projRes.error) {
      setErrorMessage(projRes.error.message);
      setIsLoading(false);
      return;
    }

    setProject(projRes.data);
    setMilestones(milestonesRes.data ?? []);
    setTasks(tasksRes.data ?? []);
    setMeetings(meetingsRes.data ?? []);
    setPhases(phasesRes.data ?? []);
    setIsLoading(false);
    setIsRefreshing(false);
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchData();
  }, [fetchData]);

  // Phase lookup
  const phaseMap = useMemo(() => {
    const map = new Map<string, string>();
    phases.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [phases]);

  // Unify Milestones, Tasks, and Meetings into single Timeline timeline
  const allTimelineItems = useMemo<UnifiedTimelineItem[]>(() => {
    const items: UnifiedTimelineItem[] = [];

    // 1. Milestones
    for (const m of milestones) {
      if (!m.target_date) continue;
      const dateKey = m.target_date.split('T')[0] ?? m.target_date;
      const isCompleted = m.effectiveStatus === 'completed';
      const isOverdue = !isCompleted && dateKey < todayKey;

      items.push({
        id: m.id,
        type: 'milestone',
        title: m.title,
        dateKey,
        status: m.effectiveStatus,
        isCompleted,
        isOverdue,
        phaseTitle: m.phase_id ? phaseMap.get(m.phase_id) ?? null : null,
        progressPercent: m.progressPercent,
        rawMilestone: m,
      });
    }

    // 2. Tasks
    for (const t of tasks) {
      if (t.is_archived || !t.due_date) continue;
      const dateKey = t.due_date.split('T')[0] ?? t.due_date;
      const isCompleted = t.status === 'done';
      const isOverdue = !isCompleted && dateKey < todayKey;

      items.push({
        id: t.id,
        type: 'task',
        title: t.title,
        dateKey,
        status: t.status,
        priority: t.priority,
        assigneeName: t.primary_assignee?.full_name ?? 'Unassigned',
        assigneeAvatar: t.primary_assignee?.avatar_url ?? null,
        isCompleted,
        isOverdue,
        phaseTitle: t.phase_id ? phaseMap.get(t.phase_id) ?? null : null,
        rawTask: t,
      });
    }

    // 3. Meetings
    for (const mtg of meetings) {
      if (!mtg.starts_at) continue;
      const dateKey = mtg.starts_at.split('T')[0] ?? '';
      const isCompleted = mtg.status === 'completed' || mtg.status === 'cancelled';
      const isOverdue = !isCompleted && dateKey < todayKey;

      const dateObj = new Date(mtg.starts_at);
      const timeStr = dateObj.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      });

      items.push({
        id: mtg.id,
        type: 'meeting',
        title: mtg.title,
        dateKey,
        timeDisplay: timeStr,
        status: mtg.status,
        assigneeName: mtg.creator?.full_name ?? 'Team Sync',
        assigneeAvatar: mtg.creator?.avatar_url ?? null,
        isCompleted,
        isOverdue,
        rawMeeting: mtg,
      });
    }

    // Sort chronologically
    return items.sort((a, b) => {
      if (a.dateKey !== b.dateKey) {
        return a.dateKey.localeCompare(b.dateKey);
      }
      // Put milestones first on same day, then meetings, then tasks
      const typeRank = { milestone: 0, meeting: 1, task: 2 };
      return typeRank[a.type] - typeRank[b.type];
    });
  }, [milestones, tasks, meetings, phaseMap, todayKey]);

  // Fast date map for calendar day indicators
  const itemsByDateMap = useMemo(() => {
    const map = new Map<string, UnifiedTimelineItem[]>();
    for (const item of allTimelineItems) {
      const list = map.get(item.dateKey) ?? [];
      list.push(item);
      map.set(item.dateKey, list);
    }
    return map;
  }, [allTimelineItems]);

  // Overall metric counts
  const metrics = useMemo(() => {
    const endOfWeek = new Date();
    endOfWeek.setDate(endOfWeek.getDate() + 7);
    const endOfWeekKey = toDateKey(endOfWeek);

    let dueThisWeek = 0;
    let overdueCount = 0;
    let milestoneCount = 0;
    let meetingCount = 0;

    for (const item of allTimelineItems) {
      if (item.type === 'milestone') milestoneCount += 1;
      if (item.type === 'meeting') meetingCount += 1;
      if (item.isOverdue) overdueCount += 1;
      if (!item.isCompleted && item.dateKey >= todayKey && item.dateKey <= endOfWeekKey) {
        dueThisWeek += 1;
      }
    }

    return { dueThisWeek, overdueCount, milestoneCount, meetingCount };
  }, [allTimelineItems, todayKey]);

  // Filtered timeline items
  const filteredTimelineItems = useMemo(() => {
    const endOfWeek = new Date();
    endOfWeek.setDate(endOfWeek.getDate() + 7);
    const endOfWeekKey = toDateKey(endOfWeek);

    return allTimelineItems.filter((item) => {
      if (activeFilter === 'milestones') return item.type === 'milestone';
      if (activeFilter === 'tasks') return item.type === 'task';
      if (activeFilter === 'meetings') return item.type === 'meeting';
      if (activeFilter === 'overdue') return item.isOverdue;
      if (activeFilter === 'due_this_week') {
        return !item.isCompleted && item.dateKey >= todayKey && item.dateKey <= endOfWeekKey;
      }
      return true;
    });
  }, [allTimelineItems, activeFilter, todayKey]);

  // Deliverables scheduled for the currently selected date in Calendar view
  const selectedDateDeliverables = useMemo(() => {
    const dayItems = itemsByDateMap.get(selectedDateKey) ?? [];
    return dayItems.filter((item) => {
      if (activeFilter === 'milestones') return item.type === 'milestone';
      if (activeFilter === 'tasks') return item.type === 'task';
      if (activeFilter === 'meetings') return item.type === 'meeting';
      if (activeFilter === 'overdue') return item.isOverdue;
      return true;
    });
  }, [itemsByDateMap, selectedDateKey, activeFilter]);

  // Calendar month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDateKey(todayKey);
  };

  // Quick-complete task toggle
  const handleToggleTaskComplete = async (item: UnifiedTimelineItem) => {
    if (item.type !== 'task' || !item.rawTask) return;
    const nextStatus = item.isCompleted ? 'in_progress' : 'done';

    // Optimistic local update
    setTasks((prev) =>
      prev.map((t) => (t.id === item.id ? { ...t, status: nextStatus } : t))
    );

    toast.showSuccess(
      nextStatus === 'done' ? 'Task marked as completed' : 'Task reopened',
      'Timeline Quick Check'
    );

    const { error } = await tasksService.updateTask(item.id, { status: nextStatus });
    if (error) {
      toast.showError(error.message, 'Update Failed');
      fetchData();
    }
  };

  // Calendar Grid Matrix calculation
  const calendarGrid = useMemo(() => {
    const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    interface GridCell {
      dayNum: number;
      dateKey: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      itemsCount: number;
      hasOverdue: boolean;
      hasMilestone: boolean;
      hasTask: boolean;
      hasMeeting: boolean;
    }

    const cells: GridCell[] = [];

    // Preceding month trailing days
    for (let i = firstDayOfWeek - 1; i >= 0; i -= 1) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(currentYear, currentMonth - 1, dayNum);
      const key = toDateKey(prevDate);
      const items = itemsByDateMap.get(key) ?? [];
      cells.push({
        dayNum,
        dateKey: key,
        isCurrentMonth: false,
        isToday: key === todayKey,
        itemsCount: items.length,
        hasOverdue: items.some((it) => it.isOverdue),
        hasMilestone: items.some((it) => it.type === 'milestone'),
        hasTask: items.some((it) => it.type === 'task'),
        hasMeeting: items.some((it) => it.type === 'meeting'),
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d += 1) {
      const curDate = new Date(currentYear, currentMonth, d);
      const key = toDateKey(curDate);
      const items = itemsByDateMap.get(key) ?? [];
      cells.push({
        dayNum: d,
        dateKey: key,
        isCurrentMonth: true,
        isToday: key === todayKey,
        itemsCount: items.length,
        hasOverdue: items.some((it) => it.isOverdue),
        hasMilestone: items.some((it) => it.type === 'milestone'),
        hasTask: items.some((it) => it.type === 'task'),
        hasMeeting: items.some((it) => it.type === 'meeting'),
      });
    }

    // Following month leading days (to complete 35 or 42 slots)
    const totalSlots = cells.length > 35 ? 42 : 35;
    const remainingSlots = totalSlots - cells.length;
    for (let d = 1; d <= remainingSlots; d += 1) {
      const nextDate = new Date(currentYear, currentMonth + 1, d);
      const key = toDateKey(nextDate);
      const items = itemsByDateMap.get(key) ?? [];
      cells.push({
        dayNum: d,
        dateKey: key,
        isCurrentMonth: false,
        isToday: key === todayKey,
        itemsCount: items.length,
        hasOverdue: items.some((it) => it.isOverdue),
        hasMilestone: items.some((it) => it.type === 'milestone'),
        hasTask: items.some((it) => it.type === 'task'),
        hasMeeting: items.some((it) => it.type === 'meeting'),
      });
    }

    return cells;
  }, [currentYear, currentMonth, itemsByDateMap, todayKey]);

  if (isLoading) {
    return <LoadingView message="Loading workspace timeline and deadlines..." />;
  }

  if (errorMessage || !project) {
    return (
      <View style={styles.errorContainer}>
        <ErrorView
          message={errorMessage ?? 'Workspace not found'}
          onRetry={fetchData}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {/* Workspace Header Strip */}
      <Card style={styles.headerCard}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerTextCol}>
            <Text style={styles.workspaceEyebrow}>WORKSPACE ROADMAP & SCHEDULE</Text>
            <Text style={styles.projectTitle} accessibilityRole="header">
              {project.name}
            </Text>
          </View>
          <IconTile name="calendar-outline" tone="primary" size={44} />
        </View>

        {/* View Mode Segmented Switch: Calendar vs Roadmap */}
        <View style={styles.viewModeSegment}>
          <Pressable
            testID="view-mode-calendar"
            accessibilityRole="button"
            accessibilityState={{ selected: viewMode === 'calendar' }}
            accessibilityLabel="Switch to Monthly Calendar view"
            onPress={() => setViewMode('calendar')}
            style={[
              styles.segmentBtn,
              viewMode === 'calendar' && styles.segmentBtnActive,
            ]}
          >
            <Ionicons
              name="calendar"
              size={16}
              color={viewMode === 'calendar' ? colors.primary : colors.textMuted}
            />
            <Text
              style={[
                styles.segmentText,
                viewMode === 'calendar' && styles.segmentTextActive,
              ]}
            >
              Monthly Calendar
            </Text>
          </Pressable>

          <Pressable
            testID="view-mode-roadmap"
            accessibilityRole="button"
            accessibilityState={{ selected: viewMode === 'roadmap' }}
            accessibilityLabel="Switch to Chronological Roadmap view"
            onPress={() => setViewMode('roadmap')}
            style={[
              styles.segmentBtn,
              viewMode === 'roadmap' && styles.segmentBtnActive,
            ]}
          >
            <Ionicons
              name="map-outline"
              size={16}
              color={viewMode === 'roadmap' ? colors.primary : colors.textMuted}
            />
            <Text
              style={[
                styles.segmentText,
                viewMode === 'roadmap' && styles.segmentTextActive,
              ]}
            >
              Linear Roadmap
            </Text>
          </Pressable>
        </View>

        {/* Quick KPI Metric Strip */}
        <View style={styles.metricStrip}>
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: colors.warningText }]}>
              {metrics.dueThisWeek}
            </Text>
            <Text style={styles.metricLabel}>Due This Week</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text
              style={[
                styles.metricValue,
                { color: metrics.overdueCount > 0 ? colors.dangerText : colors.textPrimary },
              ]}
            >
              {metrics.overdueCount}
            </Text>
            <Text style={styles.metricLabel}>Overdue</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: colors.primary }]}>
              {metrics.milestoneCount}
            </Text>
            <Text style={styles.metricLabel}>Milestones</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: colors.brandMint }]}>
              {metrics.meetingCount}
            </Text>
            <Text style={styles.metricLabel}>Sync Meetings</Text>
          </View>
        </View>
      </Card>

      {/* Filter Chips Strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterChipRow}
      >
        {(
          [
            { key: 'all', label: 'All Items' },
            { key: 'due_this_week', label: 'Due This Week' },
            { key: 'overdue', label: 'Overdue' },
            { key: 'milestones', label: 'Milestones' },
            { key: 'tasks', label: 'Tasks' },
            { key: 'meetings', label: 'Meetings' },
          ] as const
        ).map((chip) => {
          const isSelected = activeFilter === chip.key;
          return (
            <Pressable
              key={chip.key}
              testID={`timeline-filter-${chip.key}`}
              onPress={() => setActiveFilter(chip.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`Filter by ${chip.label}`}
              style={[styles.filterChip, isSelected && styles.filterChipActive]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  isSelected && styles.filterChipTextActive,
                ]}
              >
                {chip.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ===================================================================== */}
      {/* MODE 1: Interactive Monthly Calendar View */}
      {/* ===================================================================== */}
      {viewMode === 'calendar' ? (
        <>
          <Card style={styles.calendarCard}>
            {/* Month & Year Navigation Bar */}
            <View style={styles.monthNavRow}>
              <Pressable
                testID="calendar-prev-month"
                hitSlop={8}
                onPress={handlePrevMonth}
                accessibilityRole="button"
                accessibilityLabel="Go to previous month"
                style={styles.navChevronBtn}
              >
                <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
              </Pressable>

              <View style={styles.monthTitleBlock}>
                <Text style={styles.monthTitleText}>
                  {MONTH_NAMES[currentMonth]} {currentYear}
                </Text>
                {currentMonth !== today.getMonth() || currentYear !== today.getFullYear() ? (
                  <Pressable
                    testID="calendar-jump-today"
                    onPress={handleJumpToToday}
                    accessibilityRole="button"
                    accessibilityLabel="Jump to today"
                    style={styles.jumpTodayPill}
                  >
                    <Text style={styles.jumpTodayText}>Jump to Today</Text>
                  </Pressable>
                ) : null}
              </View>

              <Pressable
                testID="calendar-next-month"
                hitSlop={8}
                onPress={handleNextMonth}
                accessibilityRole="button"
                accessibilityLabel="Go to next month"
                style={styles.navChevronBtn}
              >
                <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>

            {/* Weekday Labels Header */}
            <View style={styles.weekdayHeaderRow}>
              {DAY_NAMES.map((name, idx) => (
                <Text
                  key={name}
                  style={[
                    styles.weekdayLabel,
                    (idx === 0 || idx === 6) && styles.weekdayWeekend,
                  ]}
                >
                  {name}
                </Text>
              ))}
            </View>

            {/* Calendar Days Matrix */}
            <View style={styles.daysGrid}>
              {calendarGrid.map((cell) => {
                const isSelected = cell.dateKey === selectedDateKey;

                return (
                  <Pressable
                    key={cell.dateKey}
                    testID={`calendar-day-${cell.dateKey}`}
                    accessibilityRole="button"
                    accessibilityLabel={`${cell.dateKey}, ${cell.itemsCount} scheduled items`}
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => setSelectedDateKey(cell.dateKey)}
                    style={[
                      styles.dayCell,
                      !cell.isCurrentMonth && styles.dayCellOutside,
                      cell.isToday && styles.dayCellToday,
                      isSelected && styles.dayCellSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayNumberText,
                        !cell.isCurrentMonth && styles.dayNumberOutside,
                        cell.isToday && styles.dayNumberToday,
                        isSelected && styles.dayNumberSelected,
                      ]}
                    >
                      {cell.dayNum}
                    </Text>

                    {/* Dot indicators for deadlines/syncs */}
                    {cell.itemsCount > 0 ? (
                      <View style={styles.cellDotsRow}>
                        {cell.hasOverdue ? (
                          <View style={[styles.cellDot, { backgroundColor: colors.danger }]} />
                        ) : null}
                        {cell.hasMilestone ? (
                          <View style={[styles.cellDot, { backgroundColor: colors.brandMint }]} />
                        ) : null}
                        {cell.hasTask ? (
                          <View style={[styles.cellDot, { backgroundColor: colors.primary }]} />
                        ) : null}
                        {cell.hasMeeting ? (
                          <View style={[styles.cellDot, { backgroundColor: colors.warning }]} />
                        ) : null}
                      </View>
                    ) : (
                      <View style={styles.cellDotsPlaceholder} />
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Legend strip */}
            <View style={styles.calendarLegendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.cellDot, { backgroundColor: colors.brandMint }]} />
                <Text style={styles.legendLabel}>Milestone</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.cellDot, { backgroundColor: colors.primary }]} />
                <Text style={styles.legendLabel}>Task</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.cellDot, { backgroundColor: colors.warning }]} />
                <Text style={styles.legendLabel}>Meeting</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.cellDot, { backgroundColor: colors.danger }]} />
                <Text style={styles.legendLabel}>Overdue</Text>
              </View>
            </View>
          </Card>

          {/* Selected Date Deliverables Panel */}
          <Card style={styles.dayScheduleCard} testID="selected-day-section">
            <View style={styles.scheduleHeaderRow}>
              <View style={styles.scheduleTitleCol}>
                <Text style={styles.scheduleDateLabel}>
                  {formatDisplayDate(selectedDateKey)}
                </Text>
                <Text style={styles.scheduleCountLabel}>
                  {selectedDateDeliverables.length === 1
                    ? '1 item scheduled'
                    : `${selectedDateDeliverables.length} items scheduled`}
                </Text>
              </View>

              {selectedDateKey === todayKey ? (
                <Badge label="TODAY" variant="primary" size="sm" />
              ) : null}
            </View>

            {selectedDateDeliverables.length === 0 ? (
              <EmptyState
                title="No deadlines or syncs"
                description={`No scheduled deliverables on ${formatDisplayDate(selectedDateKey)}.`}
                icon={<Ionicons name="sparkles-outline" size={32} color={colors.primary} />}
              />
            ) : (
              <View style={styles.deliverablesList}>
                {selectedDateDeliverables.map((item) => (
                  <TimelineItemCard
                    key={`${item.type}-${item.id}`}
                    item={item}
                    onToggleComplete={() => handleToggleTaskComplete(item)}
                    onOpenMilestones={() => router.push(`/projects/${project.id}/milestones` as Href)}
                    onOpenTask={() => router.push(`/projects/${project.id}/tasks/${item.id}` as Href)}
                  />
                ))}
              </View>
            )}
          </Card>
        </>
      ) : (
        /* ===================================================================== */
        /* MODE 2: Chronological Linear Roadmap View */
        /* ===================================================================== */
        <Card style={styles.roadmapCard} testID="roadmap-view">
          <View style={styles.roadmapHeaderRow}>
            <View>
              <Text style={styles.roadmapEyebrow}>CHRONOLOGICAL SEQUENCE</Text>
              <Text style={styles.roadmapTitle}>Deliverables Roadmap</Text>
            </View>
            <Badge
              label={`${filteredTimelineItems.length} Scheduled`}
              variant="primary"
              size="sm"
            />
          </View>

          {filteredTimelineItems.length === 0 ? (
            <EmptyState
              title="No upcoming roadmap items"
              description="No deliverables match the selected filter."
              icon={<Ionicons name="map-outline" size={36} color={colors.primary} />}
            />
          ) : (
            <View style={styles.roadmapListContainer}>
              {/* Continuous vertical timeline track line */}
              <View style={styles.timelineTrackLine} />

              {filteredTimelineItems.map((item) => (
                <View key={`roadmap-${item.type}-${item.id}`} style={styles.roadmapTimelineRow}>
                  {/* Timeline Node Point */}
                  <View
                    style={[
                      styles.roadmapNode,
                      item.isCompleted && styles.roadmapNodeCompleted,
                      item.isOverdue && styles.roadmapNodeOverdue,
                      item.type === 'milestone' && styles.roadmapNodeMilestone,
                    ]}
                  >
                    <Ionicons
                      name={
                        item.type === 'milestone'
                          ? 'flag'
                          : item.type === 'meeting'
                            ? 'people'
                            : item.isCompleted
                              ? 'checkmark'
                              : 'radio-button-on'
                      }
                      size={12}
                      color="#FFFFFF"
                    />
                  </View>

                  {/* Roadmap Item Card */}
                  <View style={styles.roadmapItemCol}>
                    <TimelineItemCard
                      item={item}
                      onToggleComplete={() => handleToggleTaskComplete(item)}
                      onOpenMilestones={() => router.push(`/projects/${project.id}/milestones` as Href)}
                      onOpenTask={() => router.push(`/projects/${project.id}/tasks/${item.id}` as Href)}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}
        </Card>
      )}
    </ScrollView>
  );
}

/**
 * Reusable Card representing a single Timeline Deliverable (Milestone, Task, or Meeting)
 */
function TimelineItemCard({
  item,
  onToggleComplete,
  onOpenMilestones,
  onOpenTask,
}: {
  item: UnifiedTimelineItem;
  onToggleComplete: () => void;
  onOpenMilestones: () => void;
  onOpenTask: () => void;
}) {
  const countdown = getCountdownLabel(item.dateKey, item.isCompleted);

  return (
    <View
      testID={`timeline-item-${item.type}-${item.id}`}
      style={[
        styles.itemCard,
        item.isCompleted && styles.itemCardCompleted,
        item.isOverdue && styles.itemCardOverdue,
      ]}
    >
      <View style={styles.itemTopRow}>
        <View style={styles.itemBadgeGroup}>
          <Badge
            label={item.type.toUpperCase()}
            variant={
              item.type === 'milestone'
                ? 'success'
                : item.type === 'meeting'
                  ? 'warning'
                  : 'primary'
            }
            size="sm"
          />
          <Badge label={countdown.label} variant={countdown.tone} size="sm" />
          {item.priority ? (
            <Badge
              label={item.priority.toUpperCase()}
              variant={item.priority === 'urgent' ? 'danger' : 'default'}
              size="sm"
            />
          ) : null}
        </View>

        {item.type === 'task' ? (
          <Pressable
            testID={`quick-complete-task-${item.id}`}
            hitSlop={8}
            onPress={onToggleComplete}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: item.isCompleted }}
            accessibilityLabel={item.isCompleted ? 'Mark task incomplete' : 'Mark task complete'}
            style={[
              styles.quickCheckbox,
              item.isCompleted && styles.quickCheckboxChecked,
            ]}
          >
            {item.isCompleted ? (
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            ) : null}
          </Pressable>
        ) : null}
      </View>

      <Text
        style={[
          styles.itemTitle,
          item.isCompleted && styles.itemTitleCompleted,
        ]}
        numberOfLines={2}
      >
        {item.title}
      </Text>

      {/* Milestone Progress Bar */}
      {item.type === 'milestone' && item.progressPercent !== undefined ? (
        <View style={styles.milestoneProgressWrap}>
          <ProgressBar
            value={item.progressPercent}
            total={100}
            label={`Milestone progress: ${item.progressPercent}%`}
            tone={item.progressPercent === 100 ? 'success' : 'primary'}
          />
        </View>
      ) : null}

      {/* Meta Footer */}
      <View style={styles.itemFooterRow}>
        <View style={styles.itemMetaLeft}>
          {item.assigneeName ? (
            <View style={styles.assigneePill}>
              <Avatar
                name={item.assigneeName}
                avatarUrl={item.assigneeAvatar}
                size={20}
              />
              <Text style={styles.assigneeText} numberOfLines={1}>
                {item.assigneeName}
              </Text>
            </View>
          ) : null}

          {item.timeDisplay ? (
            <View style={styles.timePill}>
              <Ionicons name="time-outline" size={12} color={colors.textMuted} />
              <Text style={styles.timeText}>{item.timeDisplay}</Text>
            </View>
          ) : null}

          {item.phaseTitle ? (
            <Text style={styles.phaseTag} numberOfLines={1}>
              Phase: {item.phaseTitle}
            </Text>
          ) : null}
        </View>

        <Pressable
          hitSlop={8}
          onPress={item.type === 'milestone' ? onOpenMilestones : onOpenTask}
          accessibilityRole="button"
          accessibilityLabel={`Open details for ${item.title}`}
          style={styles.openLinkBtn}
        >
          <Text style={styles.openLinkText}>View</Text>
          <Ionicons name="chevron-forward" size={12} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.base,
    paddingBottom: spacing.xxxl,
    gap: spacing.base,
  },
  errorContainer: {
    padding: spacing.base,
  },
  headerCard: {
    padding: spacing.base,
    gap: spacing.md,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTextCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  workspaceEyebrow: {
    ...typography.overline,
    color: colors.primary,
    letterSpacing: 1.2,
  },
  projectTitle: {
    ...typography.titleLarge,
    color: colors.textPrimary,
    marginTop: 2,
  },
  viewModeSegment: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.lg,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.md,
  },
  segmentBtnActive: {
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  segmentText: {
    ...typography.label,
    color: colors.textMuted,
    fontSize: 13,
  },
  segmentTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  metricStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    ...typography.titleMedium,
    fontWeight: '800',
  },
  metricLabel: {
    ...typography.overline,
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
  filterChipRow: {
    gap: spacing.xs,
    paddingHorizontal: 2,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    ...typography.label,
    fontSize: 12,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  calendarCard: {
    padding: spacing.base,
    gap: spacing.sm,
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  navChevronBtn: {
    padding: spacing.xs,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSubtle,
  },
  monthTitleBlock: {
    alignItems: 'center',
    gap: 2,
  },
  monthTitleText: {
    ...typography.titleMedium,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  jumpTodayPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
    backgroundColor: colors.primaryLight,
  },
  jumpTodayText: {
    ...typography.caption,
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  weekdayHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  weekdayLabel: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    ...typography.overline,
    fontSize: 11,
    color: colors.textMuted,
  },
  weekdayWeekend: {
    color: colors.textSecondary,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    marginVertical: 1,
  },
  dayCellOutside: {
    opacity: 0.35,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
  },
  dayNumberText: {
    ...typography.label,
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  dayNumberOutside: {
    color: colors.textMuted,
  },
  dayNumberToday: {
    color: colors.primary,
    fontWeight: '800',
  },
  dayNumberSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  cellDotsRow: {
    flexDirection: 'row',
    gap: 2,
    height: 6,
    alignItems: 'center',
    marginTop: 2,
  },
  cellDotsPlaceholder: {
    height: 6,
    marginTop: 2,
  },
  cellDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  calendarLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendLabel: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textMuted,
  },
  dayScheduleCard: {
    padding: spacing.base,
    gap: spacing.sm,
  },
  scheduleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scheduleTitleCol: {
    flex: 1,
  },
  scheduleDateLabel: {
    ...typography.titleSmall,
    color: colors.textPrimary,
  },
  scheduleCountLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  deliverablesList: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  itemCard: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm + 2,
    gap: spacing.xs,
  },
  itemCardCompleted: {
    opacity: 0.75,
    backgroundColor: colors.surface,
  },
  itemCardOverdue: {
    borderColor: colors.dangerBorder,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
    flex: 1,
  },
  quickCheckbox: {
    width: 22,
    height: 22,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  quickCheckboxChecked: {
    backgroundColor: colors.brandMint,
    borderColor: colors.brandMint,
  },
  itemTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  itemTitleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  milestoneProgressWrap: {
    marginTop: 2,
  },
  itemFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  itemMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    flexWrap: 'wrap',
  },
  assigneePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  assigneeText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
    maxWidth: 120,
  },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  timeText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
  phaseTag: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textMuted,
    backgroundColor: colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.sm,
  },
  openLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  openLinkText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  roadmapCard: {
    padding: spacing.base,
    gap: spacing.md,
  },
  roadmapHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  roadmapEyebrow: {
    ...typography.overline,
    color: colors.primary,
  },
  roadmapTitle: {
    ...typography.titleMedium,
    color: colors.textPrimary,
  },
  roadmapListContainer: {
    position: 'relative',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  timelineTrackLine: {
    position: 'absolute',
    top: 12,
    bottom: 12,
    left: 11,
    width: 2,
    backgroundColor: colors.border,
    zIndex: 1,
  },
  roadmapTimelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    zIndex: 2,
  },
  roadmapNode: {
    width: 24,
    height: 24,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
    marginTop: 12,
  },
  roadmapNodeCompleted: {
    backgroundColor: colors.brandMint,
  },
  roadmapNodeOverdue: {
    backgroundColor: colors.danger,
  },
  roadmapNodeMilestone: {
    backgroundColor: colors.warning,
  },
  roadmapItemCol: {
    flex: 1,
  },
});
