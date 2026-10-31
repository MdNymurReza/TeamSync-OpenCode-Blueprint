import React, { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Badge, Button, Card, EmptyState, ErrorView, LoadingView } from '@/components/ui';
import { playbooksService, ProjectPhase } from '@/features/playbooks';
import { projectsService, ProjectWithRole } from '@/features/projects';
import {
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
  tasksService,
  TaskStatus,
  TaskWithDetails,
} from '@/features/tasks';
import { colors, radii, spacing, typography } from '@/theme';

type FilterTab = 'all' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'overdue';

export default function ProjectTasksScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [project, setProject] = useState<ProjectWithRole | null>(null);
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setErrorMessage(null);

    const [projRes, phasesRes, tasksRes] = await Promise.all([
      projectsService.fetchProjectDetails(id),
      playbooksService.getProjectPhases(id),
      tasksService.fetchProjectTasks(id, {
        status:
          activeTab === 'todo' ||
          activeTab === 'in_progress' ||
          activeTab === 'in_review' ||
          activeTab === 'done'
            ? activeTab
            : undefined,
        overdueOnly: activeTab === 'overdue',
        phaseId: selectedPhaseId || undefined,
      }),
    ]);

    if (projRes.error) {
      setErrorMessage(projRes.error.message);
    } else {
      setProject(projRes.data);
    }

    if (phasesRes.data) {
      setPhases(phasesRes.data);
    }

    if (tasksRes.error) {
      setErrorMessage(tasksRes.error.message);
    } else {
      setTasks(tasksRes.data ?? []);
    }

    setIsLoading(false);
  }, [id, activeTab, selectedPhaseId]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!id) return;
      const [projRes, phasesRes, tasksRes] = await Promise.all([
        projectsService.fetchProjectDetails(id),
        playbooksService.getProjectPhases(id),
        tasksService.fetchProjectTasks(id, {
          status:
            activeTab === 'todo' ||
            activeTab === 'in_progress' ||
            activeTab === 'in_review' ||
            activeTab === 'done'
              ? activeTab
              : undefined,
          overdueOnly: activeTab === 'overdue',
          phaseId: selectedPhaseId || undefined,
        }),
      ]);
      if (!isMounted) return;

      if (projRes.error) {
        setErrorMessage(projRes.error.message);
      } else {
        setProject(projRes.data);
      }
      if (phasesRes.data) {
        setPhases(phasesRes.data);
      }
      if (tasksRes.error) {
        setErrorMessage(tasksRes.error.message);
      } else {
        setTasks(tasksRes.data ?? []);
      }
      setIsLoading(false);
    })();

    return () => {
      isMounted = false;
    };
  }, [id, activeTab, selectedPhaseId]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  };

  const handleToggleTaskStatus = async (task: TaskWithDetails) => {
    const nextStatus: TaskStatus = task.status === 'done' ? 'in_progress' : 'done';

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
    );

    const { error } = await tasksService.updateTask(task.id, { status: nextStatus });
    if (error) {
      fetchData();
    }
  };

  if (isLoading && !isRefreshing) {
    return <LoadingView message="Loading tasks..." />;
  }

  if (errorMessage || !project) {
    return (
      <View style={styles.container}>
        <ErrorView
          title="Cannot load tasks"
          message={errorMessage ?? 'Project not found.'}
          onRetry={() => fetchData()}
          style={styles.errorContainer}
        />
      </View>
    );
  }

  const nowIso = new Date().toISOString();

  return (
    <View style={styles.container}>
      {/* Top Header & New Task Button */}
      <View style={styles.topBar}>
        <View style={styles.topBarTitleContainer}>
          <Text style={styles.projectSubtitle}>{project.name}</Text>
          <Text style={styles.screenTitle} accessibilityRole="header">
            Tasks & Work
          </Text>
        </View>
        <Button
          title="New Task"
          variant="primary"
          size="sm"
          leftIcon={<Ionicons name="add" size={16} color={colors.surface} />}
          onPress={() => router.push(`/projects/${project.id}/tasks/new` as Href)}
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollContent}
        >
          {(
            [
              { key: 'all', label: 'All' },
              { key: 'todo', label: 'To Do' },
              { key: 'in_progress', label: 'In Progress' },
              { key: 'in_review', label: 'In Review' },
              { key: 'done', label: 'Done' },
              { key: 'overdue', label: 'Overdue' },
            ] as const
          ).map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.filterChip, isActive ? styles.filterChipActive : null]}
                onPress={() => setActiveTab(tab.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isActive ? styles.filterChipTextActive : null,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Optional Phase Filter Bar */}
      {phases.length > 0 ? (
        <View style={styles.phaseFilterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.phaseFilterContent}
          >
            <TouchableOpacity
              style={[
                styles.phaseFilterChip,
                selectedPhaseId === null ? styles.phaseFilterChipActive : null,
              ]}
              onPress={() => setSelectedPhaseId(null)}
            >
              <Text
                style={[
                  styles.phaseFilterChipText,
                  selectedPhaseId === null ? styles.phaseFilterChipTextActive : null,
                ]}
              >
                All Phases
              </Text>
            </TouchableOpacity>

            {phases.map((phase) => {
              const isSelected = selectedPhaseId === phase.id;
              return (
                <TouchableOpacity
                  key={phase.id}
                  style={[
                    styles.phaseFilterChip,
                    isSelected ? styles.phaseFilterChipActive : null,
                  ]}
                  onPress={() => setSelectedPhaseId(isSelected ? null : phase.id)}
                >
                  <Text
                    style={[
                      styles.phaseFilterChipText,
                      isSelected ? styles.phaseFilterChipTextActive : null,
                    ]}
                  >
                    {phase.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {/* Task List */}
      <ScrollView
        contentContainerStyle={styles.content}
        accessibilityRole="scrollview"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {tasks.length === 0 ? (
          <EmptyState
            title="No tasks found"
            description={
              activeTab !== 'all'
                ? `No tasks currently matching the "${activeTab}" filter.`
                : 'Create assigned tasks with deadlines and checklist items to keep your team aligned.'
            }
            actionTitle="Create Task"
            onAction={() => router.push(`/projects/${project.id}/tasks/new` as Href)}
          />
        ) : (
          <View style={styles.taskList}>
            {tasks.map((task) => {
              const isDone = task.status === 'done';
              const isOverdue = Boolean(task.due_date && task.due_date < nowIso && !isDone);
              const statusOpt = TASK_STATUS_OPTIONS.find((s) => s.status === task.status);
              const priorityOpt = TASK_PRIORITY_OPTIONS.find((p) => p.priority === task.priority);

              const assigneeName = task.primary_assignee?.full_name ?? 'Unassigned';
              const assigneeInitials = task.primary_assignee
                ? task.primary_assignee.full_name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)
                : '?';

              return (
                <Card key={task.id} style={[styles.taskCard, isDone ? styles.taskCardDone : null]}>
                  <TouchableOpacity
                    style={styles.taskCardTouchable}
                    onPress={() => router.push(`/projects/${project.id}/tasks/${task.id}` as Href)}
                    accessibilityRole="button"
                    accessibilityLabel={`View details for task: ${task.title}`}
                  >
                    {/* Top Row: Checkbox, Title, Badges */}
                    <View style={styles.taskHeaderRow}>
                      <TouchableOpacity
                        style={[styles.checkbox, isDone ? styles.checkboxChecked : null]}
                        onPress={() => handleToggleTaskStatus(task)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: isDone }}
                        accessibilityLabel={`Mark task ${task.title} as ${isDone ? 'incomplete' : 'done'}`}
                      >
                        {isDone ? (
                          <Ionicons name="checkmark" size={14} color={colors.surface} />
                        ) : null}
                      </TouchableOpacity>

                      <View style={styles.taskTitleCol}>
                        <Text
                          style={[styles.taskTitle, isDone ? styles.taskTitleDone : null]}
                          numberOfLines={2}
                        >
                          {task.title}
                        </Text>
                      </View>
                    </View>

                    {/* Metadata Badges: Status, Priority, Overdue, Phase */}
                    <View style={styles.badgeRow}>
                      <Badge
                        label={statusOpt?.label ?? task.status}
                        variant={statusOpt?.colorVariant ?? 'default'}
                      />
                      <Badge
                        label={priorityOpt?.label ?? task.priority}
                        variant={task.priority === 'urgent' ? 'warning' : 'default'}
                      />
                      {isOverdue ? (
                        <Badge
                          label="OVERDUE"
                          variant="warning"
                          icon={<Ionicons name="alert-circle" size={12} color={colors.warningText} />}
                        />
                      ) : null}
                      {task.phase ? (
                        <Badge
                          label={task.phase.name}
                          variant="info"
                          icon={<Ionicons name="git-commit-outline" size={12} color={colors.infoText} />}
                        />
                      ) : null}
                    </View>

                    {/* Bottom Row: Assignee & Checklist/Comment icons */}
                    <View style={styles.taskFooterRow}>
                      <View style={styles.assigneeContainer}>
                        <View style={styles.assigneeAvatar}>
                          <Text style={styles.assigneeAvatarText}>{assigneeInitials}</Text>
                        </View>
                        <Text style={styles.assigneeName} numberOfLines={1}>
                          {assigneeName}
                        </Text>
                      </View>

                      <View style={styles.metaIndicators}>
                        {task.due_date ? (
                          <View style={styles.indicatorItem}>
                            <Ionicons
                              name="calendar-outline"
                              size={13}
                              color={isOverdue ? colors.dangerText : colors.textMuted}
                            />
                            <Text
                              style={[
                                styles.indicatorText,
                                isOverdue ? styles.overdueDateText : null,
                              ]}
                            >
                              {new Date(task.due_date).toLocaleDateString()}
                            </Text>
                          </View>
                        ) : null}

                        {task.checklist_total && task.checklist_total > 0 ? (
                          <View style={styles.indicatorItem}>
                            <Ionicons name="checkbox-outline" size={13} color={colors.textMuted} />
                            <Text style={styles.indicatorText}>
                              {task.checklist_completed}/{task.checklist_total}
                            </Text>
                          </View>
                        ) : null}

                        {task.comments_count && task.comments_count > 0 ? (
                          <View style={styles.indicatorItem}>
                            <Ionicons name="chatbubble-outline" size={13} color={colors.textMuted} />
                            <Text style={styles.indicatorText}>{task.comments_count}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </TouchableOpacity>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topBarTitleContainer: {
    flex: 1,
  },
  projectSubtitle: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  screenTitle: {
    ...typography.titleLarge,
    color: colors.textPrimary,
  },
  tabContainer: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.xs,
  },
  tabScrollContent: {
    paddingHorizontal: spacing.base,
    gap: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceHover,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.surface,
  },
  phaseFilterContainer: {
    backgroundColor: colors.surfaceSubtle,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.xs,
  },
  phaseFilterContent: {
    paddingHorizontal: spacing.base,
    gap: spacing.xs,
  },
  phaseFilterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  phaseFilterChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  phaseFilterChipText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
  },
  phaseFilterChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  content: {
    padding: spacing.base,
    paddingBottom: spacing.xxxl,
    gap: spacing.base,
  },
  errorContainer: {
    padding: spacing.base,
  },
  taskList: {
    gap: spacing.sm,
  },
  taskCard: {
    padding: spacing.base,
    gap: spacing.xs,
  },
  taskCardDone: {
    opacity: 0.75,
    backgroundColor: colors.surfaceHover,
  },
  taskCardTouchable: {
    gap: spacing.xs,
  },
  taskHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  taskTitleCol: {
    flex: 1,
  },
  taskTitle: {
    ...typography.bodyMedium,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
    marginLeft: 30,
    marginVertical: 2,
  },
  taskFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginLeft: 30,
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderMuted,
  },
  assigneeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  assigneeAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assigneeAvatarText: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '700',
    color: colors.primary,
  },
  assigneeName: {
    ...typography.caption,
    color: colors.textSecondary,
    maxWidth: 120,
  },
  metaIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  indicatorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  indicatorText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
  overdueDateText: {
    color: colors.dangerText,
    fontWeight: '600',
  },
});
