import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
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
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorView,
  Input,
  LoadingView,
  ProgressBar,
} from '@/components/ui';
import { useAuth } from '@/features/auth';
import {
  MILESTONE_STATUS_OPTIONS,
  MilestoneProgressMode,
  milestonesService,
  MilestoneStatus,
  MilestoneTimelineFilter,
  MilestoneWithDetails,
} from '@/features/milestones';
import { playbooksService, ProjectPhase } from '@/features/playbooks';
import { projectsService, ProjectWithRole } from '@/features/projects';
import { tasksService, TaskWithDetails } from '@/features/tasks';
import { colors, radii, spacing, typography } from '@/theme';

const MANUAL_PROGRESS_STEPS = [0, 25, 50, 75, 100] as const;

export default function ProjectMilestonesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [project, setProject] = useState<ProjectWithRole | null>(null);
  const [milestones, setMilestones] = useState<MilestoneWithDetails[]>([]);
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [projectTasks, setProjectTasks] = useState<TaskWithDetails[]>([]);
  const [activeFilter, setActiveFilter] = useState<MilestoneTimelineFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Add / Edit Modal state
  const [isFormModalVisible, setIsFormModalVisible] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<MilestoneWithDetails | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDateText, setTargetDateText] = useState('');
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
  const [progressMode, setProgressMode] = useState<MilestoneProgressMode>('auto');
  const [manualProgress, setManualProgress] = useState<number>(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Link Tasks Modal state
  const [linkingMilestone, setLinkingMilestone] = useState<MilestoneWithDetails | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setErrorMessage(null);

    const [projRes, msRes, phasesRes, tasksRes] = await Promise.all([
      projectsService.fetchProjectDetails(id),
      milestonesService.fetchProjectMilestones(id, activeFilter),
      playbooksService.getProjectPhases(id),
      tasksService.fetchProjectTasks(id),
    ]);

    if (projRes.error) {
      setErrorMessage(projRes.error.message);
    } else {
      setProject(projRes.data);
    }

    if (msRes.error) {
      setErrorMessage(msRes.error.message);
    } else {
      setMilestones(msRes.data ?? []);
    }

    if (phasesRes.data) {
      setPhases(phasesRes.data);
    }

    if (tasksRes.data) {
      setProjectTasks(tasksRes.data);
    }

    setIsLoading(false);
  }, [id, activeFilter]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!id) return;
      const [projRes, msRes, phasesRes, tasksRes] = await Promise.all([
        projectsService.fetchProjectDetails(id),
        milestonesService.fetchProjectMilestones(id, activeFilter),
        playbooksService.getProjectPhases(id),
        tasksService.fetchProjectTasks(id),
      ]);
      if (!isMounted) return;

      if (projRes.error) {
        setErrorMessage(projRes.error.message);
      } else {
        setProject(projRes.data);
      }
      if (msRes.error) {
        setErrorMessage(msRes.error.message);
      } else {
        setMilestones(msRes.data ?? []);
      }
      if (phasesRes.data) {
        setPhases(phasesRes.data);
      }
      if (tasksRes.data) {
        setProjectTasks(tasksRes.data);
      }
      setIsLoading(false);
    })();

    return () => {
      isMounted = false;
    };
  }, [id, activeFilter]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  };

  const isOwnerOrAdmin =
    project?.currentUserRole === 'owner' || project?.currentUserRole === 'admin';

  const openCreateModal = () => {
    setEditingMilestone(null);
    setTitle('');
    setDescription('');
    setTargetDateText('');
    setSelectedPhaseId(null);
    setProgressMode('auto');
    setManualProgress(0);
    setFormError(null);
    setIsFormModalVisible(true);
  };

  const openEditModal = (milestone: MilestoneWithDetails) => {
    setEditingMilestone(milestone);
    setTitle(milestone.title);
    setDescription(milestone.description ?? '');
    setTargetDateText(
      milestone.target_date ? milestone.target_date.slice(0, 10) : ''
    );
    setSelectedPhaseId(milestone.phase_id);
    setProgressMode(milestone.progress_mode);
    setManualProgress(milestone.manual_progress);
    setFormError(null);
    setIsFormModalVisible(true);
  };

  const handleSaveMilestone = async () => {
    if (!id) return;
    if (!title.trim()) {
      setFormError('Milestone title is required');
      return;
    }

    let parsedTargetDate: string | null = null;
    if (targetDateText.trim()) {
      const match = targetDateText.trim().match(/^\d{4}-\d{2}-\d{2}$/);
      if (!match) {
        setFormError('Enter target date in YYYY-MM-DD format');
        return;
      }
      const d = new Date(targetDateText.trim());
      if (isNaN(d.getTime())) {
        setFormError('Invalid target date');
        return;
      }
      parsedTargetDate = d.toISOString();
    }

    setIsSaving(true);
    if (editingMilestone) {
      const { error } = await milestonesService.updateMilestone(editingMilestone.id, {
        title: title.trim(),
        description: description.trim() || null,
        target_date: parsedTargetDate,
        phase_id: selectedPhaseId,
        progress_mode: progressMode,
        manual_progress: manualProgress,
      });
      setIsSaving(false);

      if (error) {
        setFormError(error.message);
      } else {
        setIsFormModalVisible(false);
        setEditingMilestone(null);
        fetchData();
      }
    } else {
      const { error } = await milestonesService.createMilestone(id, {
        title: title.trim(),
        description: description.trim() || undefined,
        target_date: parsedTargetDate,
        phase_id: selectedPhaseId,
        progress_mode: progressMode,
        manual_progress: manualProgress,
      });
      setIsSaving(false);

      if (error) {
        setFormError(error.message);
      } else {
        setIsFormModalVisible(false);
        fetchData();
      }
    }
  };

  const handleStatusChange = async (
    milestone: MilestoneWithDetails,
    nextStatus: MilestoneStatus
  ) => {
    const { error } = await milestonesService.updateMilestone(milestone.id, {
      status: nextStatus,
    });
    if (error) {
      Alert.alert('Error', error.message);
    }
    fetchData();
  };

  const handleDeleteMilestone = (milestone: MilestoneWithDetails) => {
    Alert.alert(
      'Delete Milestone',
      `Are you sure you want to delete "${milestone.title}"? Linked tasks will remain in your workspace.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await milestonesService.deleteMilestone(milestone.id);
            if (error) {
              Alert.alert('Error', error.message);
            } else {
              fetchData();
            }
          },
        },
      ]
    );
  };

  const handleToggleTaskLink = async (
    task: TaskWithDetails,
    milestone: MilestoneWithDetails
  ) => {
    const isLinked = task.milestone_id === milestone.id;
    const nextMilestoneId = isLinked ? null : milestone.id;
    const { error } = await milestonesService.linkTaskToMilestone(task.id, nextMilestoneId);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      await fetchData();
    }
  };

  if (isLoading && !isRefreshing) {
    return <LoadingView message="Loading milestones & timeline..." />;
  }

  if (errorMessage || !project) {
    return (
      <View style={styles.container}>
        <ErrorView
          title="Cannot load milestones"
          message={errorMessage ?? 'Project not found.'}
          onRetry={() => fetchData()}
          style={styles.errorContainer}
        />
      </View>
    );
  }

  const completedCount = milestones.filter((m) => m.effectiveStatus === 'completed').length;
  const overdueCount = milestones.filter((m) => m.isOverdue).length;

  const getEffectiveBadge = (m: MilestoneWithDetails) => {
    switch (m.effectiveStatus) {
      case 'completed':
        return {
          label: 'Completed',
          variant: 'success' as const,
          icon: <Ionicons name="checkmark-circle" size={12} color={colors.successText} />,
        };
      case 'overdue':
        return {
          label: 'Overdue',
          variant: 'danger' as const,
          icon: <Ionicons name="alert-circle" size={12} color={colors.dangerText} />,
        };
      case 'in_progress':
        return {
          label: 'In Progress',
          variant: 'primary' as const,
          icon: <Ionicons name="trending-up-outline" size={12} color={colors.primary} />,
        };
      default:
        return {
          label: 'Upcoming',
          variant: 'default' as const,
          icon: <Ionicons name="flag-outline" size={12} color={colors.textSecondary} />,
        };
    }
  };

  return (
    <View style={styles.container}>
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
        {/* Summary Card */}
        <Card style={styles.summaryCard} variant="elevated">
          <View style={styles.summaryHeader}>
            <View style={styles.summaryTitleCol}>
              <Text style={styles.projectSubtitle}>{project.name}</Text>
              <Text style={styles.screenTitle} accessibilityRole="header">
                Milestones & Timeline
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'center' }}>
              <Button
                title="Calendar"
                variant="outline"
                size="sm"
                leftIcon={<Ionicons name="calendar-outline" size={14} color={colors.primary} />}
                onPress={() => router.push(`/projects/${id}/timeline` as Href)}
              />
              <Button
                title="Add Milestone"
                variant="primary"
                size="sm"
                leftIcon={<Ionicons name="add" size={16} color={colors.surface} />}
                onPress={openCreateModal}
              />
            </View>
          </View>

          <ProgressBar
            value={completedCount}
            total={milestones.length}
            label="Milestones completion"
            tone={
              milestones.length > 0 && completedCount === milestones.length
                ? 'success'
                : 'primary'
            }
            height={8}
          />

          <View style={styles.summaryMetaRow}>
            <Text style={styles.progressSubtext}>
              {completedCount} of {milestones.length} milestones completed
            </Text>
            {overdueCount > 0 ? (
              <Badge
                label={`${overdueCount} Overdue`}
                variant="danger"
                size="sm"
                icon={<Ionicons name="alert-circle" size={12} color={colors.dangerText} />}
              />
            ) : null}
          </View>
        </Card>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {(
            [
              { key: 'all', label: 'All' },
              { key: 'upcoming', label: 'Upcoming' },
              { key: 'overdue', label: 'Overdue' },
              { key: 'completed', label: 'Completed' },
            ] as const
          ).map((tab) => {
            const isActive = activeFilter === tab.key;
            return (
              <Pressable
                key={tab.key}
                hitSlop={6}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setActiveFilter(tab.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={`Filter ${tab.label} milestones`}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Milestones Timeline List */}
        {milestones.length === 0 ? (
          <Card style={styles.emptyCard}>
            <EmptyState
              title="No milestones found"
              description={
                activeFilter !== 'all'
                  ? `No milestones match the "${activeFilter}" filter.`
                  : 'Create target milestones and link deliverables to track your team timeline.'
              }
              icon={<Ionicons name="flag-outline" size={38} color={colors.primary} />}
              actionTitle="Add Milestone"
              onAction={openCreateModal}
            />
          </Card>
        ) : (
          <View style={styles.timelineList}>
            {milestones.map((m) => {
              const badge = getEffectiveBadge(m);
              const canDelete = isOwnerOrAdmin || m.created_by === user?.id;

              return (
                <Card key={m.id} style={styles.milestoneCard}>
                  <View style={styles.milestoneTopRow}>
                    <View style={styles.badgeWrap}>
                      <Badge
                        label={badge.label}
                        variant={badge.variant}
                        size="sm"
                        icon={badge.icon}
                      />
                      {m.hasDeadlineRisk && !m.isOverdue ? (
                        <Badge
                          label="Deadline Risk"
                          variant="warning"
                          size="sm"
                          icon={<Ionicons name="warning-outline" size={12} color={colors.warningText} />}
                        />
                      ) : null}
                      {m.phase ? (
                        <Badge label={m.phase.name} variant="info" size="sm" />
                      ) : null}
                    </View>

                    <View style={styles.cardActionsRow}>
                      <Pressable
                        hitSlop={8}
                        style={styles.iconBtn}
                        onPress={() => openEditModal(m)}
                        accessibilityRole="button"
                        accessibilityLabel={`Edit ${m.title}`}
                      >
                        <Ionicons name="pencil" size={16} color={colors.textSecondary} />
                      </Pressable>
                      {canDelete ? (
                        <Pressable
                          hitSlop={8}
                          style={styles.iconBtn}
                          onPress={() => handleDeleteMilestone(m)}
                          accessibilityRole="button"
                          accessibilityLabel={`Delete ${m.title}`}
                        >
                          <Ionicons name="trash-outline" size={16} color={colors.danger} />
                        </Pressable>
                      ) : null}
                    </View>
                  </View>

                  <Text style={styles.milestoneTitle}>{m.title}</Text>
                  {m.description ? (
                    <Text style={styles.milestoneDesc}>{m.description}</Text>
                  ) : null}

                  {/* Progress & Mode Summary */}
                  <View style={styles.progressSection}>
                    <View style={styles.progressLabelRow}>
                      <Text style={styles.progressModeLabel}>
                        {m.progress_mode === 'auto'
                          ? `Auto from tasks (${m.completedTasks}/${m.totalTasks} done)`
                          : 'Manual progress'}
                      </Text>
                      <Text style={styles.progressPercentLabel}>{m.progressPercent}%</Text>
                    </View>
                    <ProgressBar
                      value={m.progressPercent}
                      total={100}
                      label={`${m.title} progress`}
                      tone={m.effectiveStatus === 'completed' ? 'success' : 'primary'}
                    />
                  </View>

                  {/* Manual Status Chips */}
                  <View style={styles.statusSelectorRow}>
                    <Text style={styles.statusSelectorLabel}>Status:</Text>
                    <View style={styles.statusChipGroup}>
                      {MILESTONE_STATUS_OPTIONS.map((opt) => {
                        const isSelected = m.status === opt.status;
                        return (
                          <Pressable
                            key={opt.status}
                            hitSlop={6}
                            style={[
                              styles.statusChip,
                              isSelected && styles.statusChipSelected,
                            ]}
                            onPress={() => handleStatusChange(m, opt.status)}
                            accessibilityRole="button"
                            accessibilityState={{ selected: isSelected }}
                            accessibilityLabel={`Set ${m.title} status to ${opt.label}`}
                          >
                            <Text
                              style={[
                                styles.statusChipText,
                                isSelected && styles.statusChipTextSelected,
                              ]}
                            >
                              {opt.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  {/* Footer: Target Date & Link Tasks */}
                  <View style={styles.milestoneFooter}>
                    <View style={styles.dateRow}>
                      <Ionicons
                        name="calendar-outline"
                        size={14}
                        color={m.isOverdue ? colors.dangerText : colors.textMuted}
                      />
                      <Text
                        style={[
                          styles.dateText,
                          m.isOverdue && styles.overdueDateText,
                        ]}
                      >
                        {m.target_date
                          ? `Target: ${new Date(m.target_date).toLocaleDateString()}`
                          : 'No target date'}
                      </Text>
                    </View>

                    <Button
                      title={`Link Tasks (${m.totalTasks})`}
                      variant="text"
                      size="sm"
                      onPress={() => setLinkingMilestone(m)}
                      accessibilityLabel={`Link tasks for ${m.title}`}
                    />
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Add / Edit Milestone Modal */}
      <Modal
        visible={isFormModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsFormModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingMilestone ? 'Edit Milestone' : 'New Milestone'}
              </Text>
              <Pressable
                hitSlop={10}
                onPress={() => setIsFormModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close modal"
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              {formError ? <Text style={styles.modalErrorText}>{formError}</Text> : null}

              <Input
                label="Milestone Title *"
                placeholder="e.g. Architecture & Schema Sign-off"
                value={title}
                onChangeText={setTitle}
                autoFocus
              />

              <Input
                label="Description (Optional)"
                placeholder="Deliverables and acceptance criteria for this milestone"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />

              <Input
                label="Target Date (Optional)"
                placeholder="YYYY-MM-DD (e.g. 2026-11-20)"
                value={targetDateText}
                onChangeText={setTargetDateText}
              />

              {phases.length > 0 ? (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionLabel}>Workflow Phase (Optional)</Text>
                  <View style={styles.chipWrap}>
                    <Pressable
                      style={[
                        styles.optionChip,
                        selectedPhaseId === null && styles.optionChipSelected,
                      ]}
                      onPress={() => setSelectedPhaseId(null)}
                    >
                      <Text
                        style={[
                          styles.optionChipText,
                          selectedPhaseId === null && styles.optionChipTextSelected,
                        ]}
                      >
                        None
                      </Text>
                    </Pressable>
                    {phases.map((ph) => {
                      const isSelected = selectedPhaseId === ph.id;
                      return (
                        <Pressable
                          key={ph.id}
                          style={[styles.optionChip, isSelected && styles.optionChipSelected]}
                          onPress={() => setSelectedPhaseId(ph.id)}
                        >
                          <Text
                            style={[
                              styles.optionChipText,
                              isSelected && styles.optionChipTextSelected,
                            ]}
                          >
                            {ph.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionLabel}>Progress Calculation Mode</Text>
                <View style={styles.chipWrap}>
                  <Pressable
                    style={[
                      styles.optionChip,
                      progressMode === 'auto' && styles.optionChipSelected,
                    ]}
                    onPress={() => setProgressMode('auto')}
                    accessibilityRole="button"
                    accessibilityLabel="Auto progress from linked tasks"
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        progressMode === 'auto' && styles.optionChipTextSelected,
                      ]}
                    >
                      Auto from Linked Tasks
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.optionChip,
                      progressMode === 'manual' && styles.optionChipSelected,
                    ]}
                    onPress={() => setProgressMode('manual')}
                    accessibilityRole="button"
                    accessibilityLabel="Manual percentage progress"
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        progressMode === 'manual' && styles.optionChipTextSelected,
                      ]}
                    >
                      Manual Percentage
                    </Text>
                  </Pressable>
                </View>
              </View>

              {progressMode === 'manual' ? (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionLabel}>Manual Progress</Text>
                  <View style={styles.chipWrap}>
                    {MANUAL_PROGRESS_STEPS.map((pct) => {
                      const isSelected = manualProgress === pct;
                      return (
                        <Pressable
                          key={pct}
                          style={[styles.optionChip, isSelected && styles.optionChipSelected]}
                          onPress={() => setManualProgress(pct)}
                          accessibilityRole="button"
                          accessibilityLabel={`Set manual progress to ${pct}%`}
                        >
                          <Text
                            style={[
                              styles.optionChipText,
                              isSelected && styles.optionChipTextSelected,
                            ]}
                          >
                            {pct}%
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <Button
                title="Cancel"
                variant="secondary"
                size="md"
                onPress={() => setIsFormModalVisible(false)}
                style={styles.modalBtn}
              />
              <Button
                title={editingMilestone ? 'Save Changes' : 'Create Milestone'}
                variant="primary"
                size="md"
                loading={isSaving}
                onPress={handleSaveMilestone}
                style={styles.modalBtn}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Link Tasks Modal */}
      <Modal
        visible={Boolean(linkingMilestone)}
        animationType="slide"
        transparent
        onRequestClose={() => setLinkingMilestone(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Link Tasks to {linkingMilestone?.title ?? 'Milestone'}
              </Text>
              <Pressable
                hitSlop={10}
                onPress={() => setLinkingMilestone(null)}
                accessibilityRole="button"
                accessibilityLabel="Close link tasks modal"
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            {projectTasks.length === 0 ? (
              <Text style={styles.noTasksText}>
                No active tasks in this workspace yet. Create tasks on the task board first.
              </Text>
            ) : (
              <ScrollView style={styles.modalScroll}>
                {projectTasks.map((task) => {
                  const isLinked =
                    linkingMilestone !== null && task.milestone_id === linkingMilestone.id;
                  return (
                    <Pressable
                      key={task.id}
                      style={styles.linkTaskRow}
                      onPress={() =>
                        linkingMilestone ? handleToggleTaskLink(task, linkingMilestone) : undefined
                      }
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isLinked }}
                      accessibilityLabel={`Link task ${task.title}`}
                    >
                      <View style={[styles.checkbox, isLinked && styles.checkboxChecked]}>
                        {isLinked ? (
                          <Ionicons name="checkmark" size={14} color={colors.surface} />
                        ) : null}
                      </View>
                      <Text style={styles.linkTaskTitle} numberOfLines={1}>
                        {task.title}
                      </Text>
                      <Badge
                        label={task.status === 'done' ? 'Done' : 'Open'}
                        variant={task.status === 'done' ? 'success' : 'default'}
                        size="sm"
                      />
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            <Button
              title="Done"
              variant="primary"
              size="md"
              onPress={() => setLinkingMilestone(null)}
            />
          </View>
        </View>
      </Modal>
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
  summaryCard: {
    padding: spacing.base,
    gap: spacing.sm,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTitleCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  projectSubtitle: {
    ...typography.overline,
    color: colors.primary,
    marginBottom: 2,
  },
  screenTitle: {
    ...typography.titleLarge,
    color: colors.textPrimary,
  },
  summaryMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressSubtext: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  filterRow: {
    gap: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
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
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.surface,
  },
  emptyCard: {
    paddingVertical: spacing.xs,
  },
  timelineList: {
    gap: spacing.md,
  },
  milestoneCard: {
    padding: spacing.base,
    gap: spacing.sm,
  },
  milestoneTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    flex: 1,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconBtn: {
    padding: 6,
    borderRadius: radii.sm,
  },
  milestoneTitle: {
    ...typography.titleMedium,
    color: colors.textPrimary,
  },
  milestoneDesc: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  progressSection: {
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressModeLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  progressPercentLabel: {
    ...typography.label,
    color: colors.textPrimary,
  },
  statusSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  statusSelectorLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  statusChipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  statusChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusChipSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  statusChipText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
  },
  statusChipTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  milestoneFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  overdueDateText: {
    color: colors.dangerText,
    fontWeight: '600',
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    padding: spacing.base,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.base,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    ...typography.titleMedium,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalErrorText: {
    ...typography.caption,
    color: colors.dangerText,
    backgroundColor: colors.dangerBg,
    padding: spacing.sm,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
  },
  modalSection: {
    gap: spacing.xs,
    marginBottom: spacing.base,
  },
  modalSectionLabel: {
    ...typography.label,
    fontSize: 13,
    color: colors.textPrimary,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  optionChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionChipSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  optionChipText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  optionChipTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalBtn: {
    flex: 1,
  },
  noTasksText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  linkTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.borderMuted,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  linkTaskTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    flex: 1,
  },
});
