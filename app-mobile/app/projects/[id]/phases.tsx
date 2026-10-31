import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Badge, Button, Card, EmptyState, ErrorView, Input, LoadingView } from '@/components/ui';
import {
  PLAYBOOK_TEMPLATES,
  playbooksService,
  ProjectPhase,
} from '@/features/playbooks';
import { projectsService, ProjectWithRole } from '@/features/projects';
import { ProjectType } from '@/types/database';
import { colors, radii, spacing, typography } from '@/theme';

export default function ProjectPhasesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [project, setProject] = useState<ProjectWithRole | null>(null);
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal states
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isTemplateModalVisible, setIsTemplateModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [editingPhase, setEditingPhase] = useState<ProjectPhase | null>(null);
  const [phaseName, setPhaseName] = useState('');
  const [phaseDescription, setPhaseDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setErrorMessage(null);

    const [projRes, phasesRes] = await Promise.all([
      projectsService.fetchProjectDetails(id),
      playbooksService.getProjectPhases(id),
    ]);

    if (projRes.error) {
      setErrorMessage(projRes.error.message);
    } else {
      setProject(projRes.data);
    }

    if (phasesRes.error) {
      setErrorMessage(phasesRes.error.message);
    } else {
      setPhases(phasesRes.data ?? []);
    }

    setIsLoading(false);
  }, [id]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!id) return;
      const [projRes, phasesRes] = await Promise.all([
        projectsService.fetchProjectDetails(id),
        playbooksService.getProjectPhases(id),
      ]);
      if (!isMounted) return;

      if (projRes.error) {
        setErrorMessage(projRes.error.message);
      } else {
        setProject(projRes.data);
      }
      if (phasesRes.error) {
        setErrorMessage(phasesRes.error.message);
      } else {
        setPhases(phasesRes.data ?? []);
      }
      setIsLoading(false);
    })();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  };

  const isOwnerOrAdmin =
    project?.currentUserRole === 'owner' || project?.currentUserRole === 'admin';

  // Toggle phase completed
  const handleToggleComplete = async (phase: ProjectPhase) => {
    if (!isOwnerOrAdmin) return;
    const newStatus = !phase.is_completed;
    // Optimistic update
    setPhases((prev) =>
      prev.map((p) => (p.id === phase.id ? { ...p, is_completed: newStatus } : p))
    );

    const { error } = await playbooksService.togglePhaseCompletion(phase.id, newStatus);
    if (error) {
      Alert.alert('Error', error.message);
      fetchData();
    }
  };

  // Reorder phase up
  const handleMoveUp = async (index: number) => {
    if (!id || index <= 0 || !isOwnerOrAdmin) return;
    const newPhases = [...phases];
    const temp = newPhases[index - 1]!;
    newPhases[index - 1] = newPhases[index]!;
    newPhases[index] = temp;
    setPhases(newPhases);

    const phaseIds = newPhases.map((p) => p.id);
    const { error } = await playbooksService.reorderPhases(id, phaseIds);
    if (error) {
      Alert.alert('Error', error.message);
      fetchData();
    }
  };

  // Reorder phase down
  const handleMoveDown = async (index: number) => {
    if (!id || index >= phases.length - 1 || !isOwnerOrAdmin) return;
    const newPhases = [...phases];
    const temp = newPhases[index + 1]!;
    newPhases[index + 1] = newPhases[index]!;
    newPhases[index] = temp;
    setPhases(newPhases);

    const phaseIds = newPhases.map((p) => p.id);
    const { error } = await playbooksService.reorderPhases(id, phaseIds);
    if (error) {
      Alert.alert('Error', error.message);
      fetchData();
    }
  };

  // Open add phase modal
  const openAddModal = () => {
    setPhaseName('');
    setPhaseDescription('');
    setFormError(null);
    setIsAddModalVisible(true);
  };

  // Submit add phase
  const handleSaveNewPhase = async () => {
    if (!id) return;
    if (!phaseName.trim()) {
      setFormError('Phase title is required');
      return;
    }

    setIsSaving(true);
    const { error } = await playbooksService.createPhase(id, {
      name: phaseName.trim(),
      description: phaseDescription.trim() || undefined,
    });
    setIsSaving(false);

    if (error) {
      setFormError(error.message);
    } else {
      setIsAddModalVisible(false);
      fetchData();
    }
  };

  // Open edit modal
  const openEditModal = (phase: ProjectPhase) => {
    setEditingPhase(phase);
    setPhaseName(phase.name);
    setPhaseDescription(phase.description ?? '');
    setFormError(null);
    setIsEditModalVisible(true);
  };

  // Submit edit phase
  const handleSaveEditPhase = async () => {
    if (!editingPhase) return;
    if (!phaseName.trim()) {
      setFormError('Phase title is required');
      return;
    }

    setIsSaving(true);
    const { error } = await playbooksService.updatePhase(editingPhase.id, {
      name: phaseName.trim(),
      description: phaseDescription.trim() || undefined,
    });
    setIsSaving(false);

    if (error) {
      setFormError(error.message);
    } else {
      setIsEditModalVisible(false);
      setEditingPhase(null);
      fetchData();
    }
  };

  // Delete phase confirmation
  const handleDeletePhase = (phase: ProjectPhase) => {
    if (!isOwnerOrAdmin) return;
    Alert.alert(
      'Delete Phase',
      `Are you sure you want to delete "${phase.name}"? Tasks associated with this phase will remain intact.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await playbooksService.deletePhase(phase.id);
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

  // Apply template
  const handleApplyTemplate = (templateType: ProjectType) => {
    if (!id) return;
    const template = PLAYBOOK_TEMPLATES[templateType];
    Alert.alert(
      `Apply ${template?.title ?? templateType} Playbook`,
      'This will replace the current phases with the standard template phases. Are you sure you want to proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply Template',
          style: 'destructive',
          onPress: async () => {
            setIsTemplateModalVisible(false);
            setIsLoading(true);
            const { error } = await playbooksService.applyPlaybookTemplate(id, templateType);
            if (error) {
              Alert.alert('Error', error.message);
            }
            await fetchData();
          },
        },
      ]
    );
  };

  if (isLoading && !isRefreshing) {
    return <LoadingView message="Loading workflow phases..." />;
  }

  if (errorMessage || !project) {
    return (
      <View style={styles.container}>
        <ErrorView
          title="Cannot load phases"
          message={errorMessage ?? 'Project not found.'}
          onRetry={() => fetchData()}
          style={styles.errorContainer}
        />
      </View>
    );
  }

  const completedCount = phases.filter((p) => p.is_completed).length;
  const progressPercent =
    phases.length > 0 ? Math.round((completedCount / phases.length) * 100) : 0;

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
        {/* Header Summary Card */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View>
              <Text style={styles.projectSubtitle}>{project.name}</Text>
              <Text style={styles.screenTitle} accessibilityRole="header">
                Workflow & Phases
              </Text>
            </View>
            <Badge
              label={`${progressPercent}% Complete`}
              variant={progressPercent === 100 ? 'success' : 'primary'}
            />
          </View>

          {/* Progress bar */}
          <View style={styles.progressBarTrack} accessibilityRole="progressbar">
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>

          <Text style={styles.progressSubtext}>
            {completedCount} of {phases.length} phases completed
          </Text>

          {/* Top buttons for Admins/Owners */}
          {isOwnerOrAdmin ? (
            <View style={styles.headerButtonRow}>
              <Button
                title="Add Phase"
                variant="primary"
                size="sm"
                leftIcon={<Ionicons name="add" size={16} color={colors.surface} />}
                onPress={openAddModal}
              />
              <Button
                title="Playbook Templates"
                variant="outline"
                size="sm"
                leftIcon={<Ionicons name="albums-outline" size={16} color={colors.textPrimary} />}
                onPress={() => setIsTemplateModalVisible(true)}
              />
            </View>
          ) : (
            <Text style={styles.readOnlyNote}>
              <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} />{' '}
              Phases are managed by project owners and admins.
            </Text>
          )}
        </Card>

        {/* Phase List */}
        {phases.length === 0 ? (
          <EmptyState
            title="No phases yet"
            description="Set up your project workflow by selecting a playbook template or adding custom phases."
            actionTitle={isOwnerOrAdmin ? 'Apply Playbook' : undefined}
            onAction={isOwnerOrAdmin ? () => setIsTemplateModalVisible(true) : undefined}
          />
        ) : (
          <View style={styles.phaseList}>
            {phases.map((phase, index) => {
              const isFirst = index === 0;
              const isLast = index === phases.length - 1;

              return (
                <Card
                  key={phase.id}
                  style={[styles.phaseCard, phase.is_completed ? styles.phaseCardCompleted : null]}
                >
                  <View style={styles.phaseHeaderRow}>
                    {/* Completion checkbox / toggle */}
                    <TouchableOpacity
                      style={[
                        styles.checkbox,
                        phase.is_completed ? styles.checkboxChecked : null,
                      ]}
                      onPress={() => handleToggleComplete(phase)}
                      disabled={!isOwnerOrAdmin}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: phase.is_completed }}
                      accessibilityLabel={`Mark phase ${phase.name} as ${phase.is_completed ? 'incomplete' : 'complete'}`}
                    >
                      {phase.is_completed ? (
                        <Ionicons name="checkmark" size={16} color={colors.surface} />
                      ) : null}
                    </TouchableOpacity>

                    {/* Phase sequence & title */}
                    <View style={styles.phaseTitleContainer}>
                      <View style={styles.phaseOrderBadge}>
                        <Text style={styles.phaseOrderText}>Phase {index + 1}</Text>
                      </View>
                      <Text
                        style={[
                          styles.phaseName,
                          phase.is_completed ? styles.phaseNameCompleted : null,
                        ]}
                      >
                        {phase.name}
                      </Text>
                    </View>

                    {/* Action buttons */}
                    {isOwnerOrAdmin ? (
                      <View style={styles.phaseActionsRow}>
                        <TouchableOpacity
                          style={[styles.actionIconBtn, isFirst ? styles.iconDisabled : null]}
                          disabled={isFirst}
                          onPress={() => handleMoveUp(index)}
                          accessibilityLabel={`Move ${phase.name} up`}
                        >
                          <Ionicons
                            name="arrow-up"
                            size={16}
                            color={isFirst ? colors.textMuted : colors.textPrimary}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionIconBtn, isLast ? styles.iconDisabled : null]}
                          disabled={isLast}
                          onPress={() => handleMoveDown(index)}
                          accessibilityLabel={`Move ${phase.name} down`}
                        >
                          <Ionicons
                            name="arrow-down"
                            size={16}
                            color={isLast ? colors.textMuted : colors.textPrimary}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionIconBtn}
                          onPress={() => openEditModal(phase)}
                          accessibilityLabel={`Edit ${phase.name}`}
                        >
                          <Ionicons name="pencil" size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionIconBtn}
                          onPress={() => handleDeletePhase(phase)}
                          accessibilityLabel={`Delete ${phase.name}`}
                        >
                          <Ionicons name="trash-outline" size={16} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>

                  {phase.description ? (
                    <Text style={styles.phaseDesc}>{phase.description}</Text>
                  ) : null}
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Add Phase Modal */}
      <Modal
        visible={isAddModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Project Phase</Text>
              <TouchableOpacity
                onPress={() => setIsAddModalVisible(false)}
                accessibilityLabel="Close modal"
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {formError ? <Text style={styles.modalErrorText}>{formError}</Text> : null}

            <Input
              label="Phase Title *"
              placeholder="e.g. Design & Task Division"
              value={phaseName}
              onChangeText={setPhaseName}
              autoFocus
            />

            <Input
              label="Description (Optional)"
              placeholder="Objectives and scope for this phase"
              value={phaseDescription}
              onChangeText={setPhaseDescription}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalBtnRow}>
              <Button
                title="Cancel"
                variant="outline"
                size="md"
                onPress={() => setIsAddModalVisible(false)}
                style={styles.modalBtn}
              />
              <Button
                title="Create Phase"
                variant="primary"
                size="md"
                loading={isSaving}
                onPress={handleSaveNewPhase}
                style={styles.modalBtn}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Phase Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Phase</Text>
              <TouchableOpacity
                onPress={() => setIsEditModalVisible(false)}
                accessibilityLabel="Close modal"
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {formError ? <Text style={styles.modalErrorText}>{formError}</Text> : null}

            <Input
              label="Phase Title *"
              placeholder="e.g. Implementation"
              value={phaseName}
              onChangeText={setPhaseName}
              autoFocus
            />

            <Input
              label="Description (Optional)"
              placeholder="Objectives and scope for this phase"
              value={phaseDescription}
              onChangeText={setPhaseDescription}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalBtnRow}>
              <Button
                title="Cancel"
                variant="outline"
                size="md"
                onPress={() => setIsEditModalVisible(false)}
                style={styles.modalBtn}
              />
              <Button
                title="Save Changes"
                variant="primary"
                size="md"
                loading={isSaving}
                onPress={handleSaveEditPhase}
                style={styles.modalBtn}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Select Playbook Template Modal */}
      <Modal
        visible={isTemplateModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsTemplateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.templateModalContent]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Playbook Templates</Text>
              <TouchableOpacity
                onPress={() => setIsTemplateModalVisible(false)}
                accessibilityLabel="Close modal"
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.templateModalSubtitle}>
              Select a standard academic or software playbook to populate your project workflow.
            </Text>

            <ScrollView style={styles.templateList}>
              {Object.values(PLAYBOOK_TEMPLATES).map((template) => (
                <TouchableOpacity
                  key={template.id}
                  style={styles.templateCard}
                  onPress={() => handleApplyTemplate(template.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Apply ${template.title} template`}
                >
                  <View style={styles.templateCardHeader}>
                    <Text style={styles.templateCardTitle}>{template.title}</Text>
                    <Badge label={`${template.defaultPhases.length} Phases`} variant="default" />
                  </View>
                  <Text style={styles.templateCardDesc}>{template.description}</Text>
                  <View style={styles.templatePhasesPreview}>
                    {template.defaultPhases.map((dp, i) => (
                      <Text key={i} style={styles.templatePhaseItem}>
                        • {dp.name}
                      </Text>
                    ))}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
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
    alignItems: 'flex-start',
  },
  projectSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  screenTitle: {
    ...typography.titleLarge,
    color: colors.textPrimary,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: colors.surfaceHover,
    borderRadius: radii.full,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radii.full,
  },
  progressSubtext: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  headerButtonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  readOnlyNote: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  phaseList: {
    gap: spacing.sm,
  },
  phaseCard: {
    padding: spacing.base,
    gap: spacing.xs,
  },
  phaseCardCompleted: {
    opacity: 0.8,
    backgroundColor: colors.surfaceHover,
  },
  phaseHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  checkboxChecked: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  phaseTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  phaseOrderBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceHover,
  },
  phaseOrderText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  phaseName: {
    ...typography.bodyMedium,
    fontWeight: '600',
    color: colors.textPrimary,
    flexShrink: 1,
  },
  phaseNameCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  phaseDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: 32, // align past checkbox
  },
  phaseActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionIconBtn: {
    padding: 6,
    borderRadius: radii.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconDisabled: {
    opacity: 0.3,
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.base,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.base,
    gap: spacing.base,
    maxHeight: '85%',
  },
  templateModalContent: {
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    ...typography.titleMedium,
    color: colors.textPrimary,
  },
  modalErrorText: {
    ...typography.caption,
    color: colors.dangerText,
    backgroundColor: colors.dangerBg,
    padding: spacing.sm,
    borderRadius: radii.sm,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  modalBtn: {
    flex: 1,
  },
  templateModalSubtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  templateList: {
    marginTop: spacing.xs,
  },
  templateCard: {
    padding: spacing.base,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  templateCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  templateCardTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  templateCardDesc: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  templatePhasesPreview: {
    marginTop: spacing.xs,
    paddingLeft: spacing.xs,
    gap: 2,
  },
  templatePhaseItem: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
  },
});
