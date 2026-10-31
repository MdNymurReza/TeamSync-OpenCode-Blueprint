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
import { useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorView,
  Input,
  LoadingView,
} from '@/components/ui';
import { useAuth } from '@/features/auth';
import {
  DECISION_STATUS_OPTIONS,
  DecisionListFilter,
  decisionsService,
  DecisionWithDetails,
} from '@/features/decisions';
import { meetingsService, MeetingWithDetails } from '@/features/meetings';
import { milestonesService, MilestoneWithDetails } from '@/features/milestones';
import { projectsService, ProjectWithRole } from '@/features/projects';
import { colors, radii, spacing, typography } from '@/theme';

export default function ProjectDecisionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [project, setProject] = useState<ProjectWithRole | null>(null);
  const [decisions, setDecisions] = useState<DecisionWithDetails[]>([]);
  const [meetings, setMeetings] = useState<MeetingWithDetails[]>([]);
  const [milestones, setMilestones] = useState<MilestoneWithDetails[]>([]);
  const [activeFilter, setActiveFilter] = useState<DecisionListFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Create / Supersede Modal State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [supersedingTarget, setSupersedingTarget] = useState<DecisionWithDetails | null>(
    null
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contextReason, setContextReason] = useState('');
  const [initialStatus, setInitialStatus] = useState<'accepted' | 'proposed'>('accepted');
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setErrorMessage(null);

    const [projRes, decRes, mtgRes, msRes] = await Promise.all([
      projectsService.fetchProjectDetails(id),
      decisionsService.fetchProjectDecisions(id, activeFilter),
      meetingsService?.fetchProjectMeetings
        ? meetingsService.fetchProjectMeetings(id)
        : Promise.resolve({ data: [] as MeetingWithDetails[], error: null }),
      milestonesService?.fetchProjectMilestones
        ? milestonesService.fetchProjectMilestones(id)
        : Promise.resolve({ data: [] as MilestoneWithDetails[], error: null }),
    ]);

    if (projRes.error) {
      setErrorMessage(projRes.error.message);
    } else {
      setProject(projRes.data);
    }

    if (decRes.error) {
      setErrorMessage(decRes.error.message);
    } else {
      setDecisions(decRes.data ?? []);
    }

    if (mtgRes.data) {
      setMeetings(mtgRes.data);
    }

    if (msRes.data) {
      setMilestones(msRes.data);
    }

    setIsLoading(false);
  }, [id, activeFilter]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!id) return;
      const [projRes, decRes, mtgRes, msRes] = await Promise.all([
        projectsService.fetchProjectDetails(id),
        decisionsService.fetchProjectDecisions(id, activeFilter),
        meetingsService?.fetchProjectMeetings
          ? meetingsService.fetchProjectMeetings(id)
          : Promise.resolve({ data: [] as MeetingWithDetails[], error: null }),
        milestonesService?.fetchProjectMilestones
          ? milestonesService.fetchProjectMilestones(id)
          : Promise.resolve({ data: [] as MilestoneWithDetails[], error: null }),
      ]);
      if (!isMounted) return;

      if (projRes.error) {
        setErrorMessage(projRes.error.message);
      } else {
        setProject(projRes.data);
      }
      if (decRes.error) {
        setErrorMessage(decRes.error.message);
      } else {
        setDecisions(decRes.data ?? []);
      }
      if (mtgRes.data) {
        setMeetings(mtgRes.data);
      }
      if (msRes.data) {
        setMilestones(msRes.data);
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
    setSupersedingTarget(null);
    setTitle('');
    setDescription('');
    setContextReason('');
    setInitialStatus('accepted');
    setSelectedMeetingId(null);
    setSelectedMilestoneId(null);
    setFormError(null);
    setIsModalVisible(true);
  };

  const openSupersedeModal = (prior: DecisionWithDetails) => {
    setSupersedingTarget(prior);
    setTitle(`${prior.title} (Revised)`);
    setDescription(prior.description);
    setContextReason('');
    setInitialStatus('accepted');
    setSelectedMeetingId(prior.meeting_id);
    setSelectedMilestoneId(prior.milestone_id);
    setFormError(null);
    setIsModalVisible(true);
  };

  const handleSaveDecision = async () => {
    if (!id) return;
    if (!title.trim()) {
      setFormError('Decision title is required');
      return;
    }
    if (!description.trim()) {
      setFormError('Decision description is required');
      return;
    }

    setIsSaving(true);
    if (supersedingTarget) {
      const { error } = await decisionsService.supersedeDecision(supersedingTarget, {
        title: title.trim(),
        description: description.trim(),
        context_reason: contextReason.trim() || null,
        meeting_id: selectedMeetingId,
        milestone_id: selectedMilestoneId,
      });
      setIsSaving(false);

      if (error) {
        setFormError(error.message);
      } else {
        setIsModalVisible(false);
        setSupersedingTarget(null);
        fetchData();
      }
    } else {
      const { error } = await decisionsService.createDecision(id, {
        title: title.trim(),
        description: description.trim(),
        context_reason: contextReason.trim() || null,
        status: initialStatus,
        meeting_id: selectedMeetingId,
        milestone_id: selectedMilestoneId,
      });
      setIsSaving(false);

      if (error) {
        setFormError(error.message);
      } else {
        setIsModalVisible(false);
        fetchData();
      }
    }
  };

  const handleAcceptOrReject = async (
    decision: DecisionWithDetails,
    nextStatus: 'accepted' | 'rejected'
  ) => {
    const { error } = await decisionsService.updateDecisionStatus(decision, nextStatus);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      fetchData();
    }
  };

  const handleDeleteProposed = (decision: DecisionWithDetails) => {
    Alert.alert(
      'Delete Decision',
      `Are you sure you want to delete "${decision.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await decisionsService.deleteDecision(decision);
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

  if (isLoading && !isRefreshing) {
    return <LoadingView message="Loading decision log..." />;
  }

  if (errorMessage || !project) {
    return (
      <View style={styles.container}>
        <ErrorView
          title="Cannot load decisions"
          message={errorMessage ?? 'Project not found.'}
          onRetry={() => fetchData()}
          style={styles.errorContainer}
        />
      </View>
    );
  }

  const acceptedCount = decisions.filter((d) => d.status === 'accepted').length;
  const proposedCount = decisions.filter((d) => d.status === 'proposed').length;
  const supersededCount = decisions.filter((d) => d.status === 'superseded').length;

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
                Decision Log
              </Text>
            </View>
            <Button
              title="Log Decision"
              variant="primary"
              size="sm"
              leftIcon={<Ionicons name="add" size={16} color={colors.surface} />}
              onPress={openCreateModal}
              accessibilityLabel="Log new decision"
            />
          </View>

          <Text style={styles.invariantCaption}>
            Accepted decisions are preserved permanently. Use Supersede to revise an active
            decision without losing history.
          </Text>

          <View style={styles.summaryMetaRow}>
            <Badge label={`${acceptedCount} Accepted`} variant="success" size="sm" />
            <Badge label={`${proposedCount} Proposed`} variant="info" size="sm" />
            {supersededCount > 0 ? (
              <Badge label={`${supersededCount} Superseded`} variant="warning" size="sm" />
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
              { key: 'accepted', label: 'Accepted' },
              { key: 'proposed', label: 'Proposed' },
              { key: 'superseded', label: 'Superseded' },
              { key: 'rejected', label: 'Rejected' },
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
                accessibilityLabel={`Filter ${tab.label} decisions`}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Decisions List */}
        {decisions.length === 0 ? (
          <Card style={styles.emptyCard}>
            <EmptyState
              title="No decisions recorded yet"
              description={
                activeFilter !== 'all'
                  ? `No decisions match the "${activeFilter}" filter.`
                  : 'Record architectural, scope, or workflow decisions so your team has an audit trail.'
              }
              icon={
                <Ionicons name="git-pull-request-outline" size={38} color={colors.primary} />
              }
              actionTitle="Log Decision"
              onAction={openCreateModal}
            />
          </Card>
        ) : (
          <View style={styles.decisionsList}>
            {decisions.map((d) => {
              const statusOpt =
                DECISION_STATUS_OPTIONS.find((o) => o.status === d.status) ?? {
                  status: 'accepted' as const,
                  label: 'Accepted',
                  badgeVariant: 'success' as const,
                };
              const canDelete =
                (d.status === 'proposed' || d.status === 'rejected') &&
                (isOwnerOrAdmin || d.created_by === user?.id);

              return (
                <Card key={d.id} style={styles.decisionCard}>
                  <View style={styles.decisionTopRow}>
                    <View style={styles.badgeWrap}>
                      <Badge
                        label={statusOpt.label}
                        variant={statusOpt.badgeVariant}
                        size="sm"
                      />
                      {d.meeting ? (
                        <Badge
                          label={`Meeting: ${d.meeting.title}`}
                          variant="default"
                          size="sm"
                        />
                      ) : null}
                      {d.milestone ? (
                        <Badge
                          label={`Milestone: ${d.milestone.title}`}
                          variant="info"
                          size="sm"
                        />
                      ) : null}
                    </View>

                    {canDelete ? (
                      <Pressable
                        hitSlop={8}
                        style={styles.iconBtn}
                        onPress={() => handleDeleteProposed(d)}
                        accessibilityRole="button"
                        accessibilityLabel={`Delete ${d.title}`}
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.danger} />
                      </Pressable>
                    ) : null}
                  </View>

                  <Text
                    style={[
                      styles.decisionTitle,
                      d.status === 'superseded' && styles.decisionTitleSuperseded,
                    ]}
                  >
                    {d.title}
                  </Text>

                  <Text style={styles.decisionDesc}>{d.description}</Text>

                  {d.context_reason ? (
                    <View style={styles.reasonBlock}>
                      <Text style={styles.reasonLabel}>Context & Rationale</Text>
                      <Text style={styles.reasonBody}>{d.context_reason}</Text>
                    </View>
                  ) : null}

                  {/* Lineage Traceability */}
                  {d.supersedes ? (
                    <View style={styles.lineageBox}>
                      <Ionicons
                        name="return-up-forward-outline"
                        size={15}
                        color={colors.primary}
                      />
                      <Text style={styles.lineageText}>
                        Supersedes earlier decision: {d.supersedes.title}
                      </Text>
                    </View>
                  ) : null}

                  {d.superseded_by ? (
                    <View style={[styles.lineageBox, styles.lineageBoxWarning]}>
                      <Ionicons
                        name="git-compare-outline"
                        size={15}
                        color={colors.warningText}
                      />
                      <Text style={styles.lineageWarningText}>
                        Superseded by: {d.superseded_by.title}
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.decisionFooter}>
                    <Text style={styles.metaText}>
                      {d.author?.full_name ? `By ${d.author.full_name} • ` : ''}
                      {new Date(d.decided_at).toLocaleDateString()}
                    </Text>

                    <View style={styles.footerBtns}>
                      {d.status === 'proposed' ? (
                        <>
                          <Button
                            title="Accept"
                            variant="primary"
                            size="sm"
                            onPress={() => handleAcceptOrReject(d, 'accepted')}
                            accessibilityLabel={`Accept decision ${d.title}`}
                          />
                          <Button
                            title="Reject"
                            variant="outline"
                            size="sm"
                            onPress={() => handleAcceptOrReject(d, 'rejected')}
                            accessibilityLabel={`Reject decision ${d.title}`}
                          />
                        </>
                      ) : null}

                      {d.status === 'accepted' ? (
                        <Button
                          title="Supersede / Revise"
                          variant="soft"
                          size="sm"
                          leftIcon={
                            <Ionicons
                              name="git-branch-outline"
                              size={14}
                              color={colors.primary}
                            />
                          }
                          onPress={() => openSupersedeModal(d)}
                          accessibilityLabel={`Supersede decision ${d.title}`}
                        />
                      ) : null}
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Log / Supersede Decision Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {supersedingTarget
                  ? `Supersede: ${supersedingTarget.title}`
                  : 'Log Team Decision'}
              </Text>
              <Pressable
                hitSlop={10}
                onPress={() => setIsModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close decision modal"
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              {supersedingTarget ? (
                <View style={styles.supersedeNotice}>
                  <Text style={styles.supersedeNoticeText}>
                    This creates a new Accepted decision and marks &ldquo;
                    {supersedingTarget.title}&rdquo; as Superseded so the original record is
                    preserved.
                  </Text>
                </View>
              ) : null}

              {formError ? <Text style={styles.modalErrorText}>{formError}</Text> : null}

              <Input
                label="Decision Title *"
                placeholder="e.g. Use PostgreSQL RLS for multi-tenant isolation"
                value={title}
                onChangeText={setTitle}
                autoFocus
              />

              <Input
                label="Decision Statement *"
                placeholder="Clearly state what the team decided..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />

              <Input
                label="Context & Rationale (Optional)"
                placeholder="Why was this option chosen over alternatives?"
                value={contextReason}
                onChangeText={setContextReason}
                multiline
                numberOfLines={3}
              />

              {!supersedingTarget ? (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionLabel}>Initial Status</Text>
                  <View style={styles.chipWrap}>
                    <Pressable
                      style={[
                        styles.optionChip,
                        initialStatus === 'accepted' && styles.optionChipSelected,
                      ]}
                      onPress={() => setInitialStatus('accepted')}
                      accessibilityRole="button"
                      accessibilityLabel="Set initial status to Accepted"
                    >
                      <Text
                        style={[
                          styles.optionChipText,
                          initialStatus === 'accepted' && styles.optionChipTextSelected,
                        ]}
                      >
                        Accepted
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.optionChip,
                        initialStatus === 'proposed' && styles.optionChipSelected,
                      ]}
                      onPress={() => setInitialStatus('proposed')}
                      accessibilityRole="button"
                      accessibilityLabel="Set initial status to Proposed"
                    >
                      <Text
                        style={[
                          styles.optionChipText,
                          initialStatus === 'proposed' && styles.optionChipTextSelected,
                        ]}
                      >
                        Proposed
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              {meetings.length > 0 ? (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionLabel}>Linked Meeting (Optional)</Text>
                  <View style={styles.chipWrap}>
                    <Pressable
                      style={[
                        styles.optionChip,
                        selectedMeetingId === null && styles.optionChipSelected,
                      ]}
                      onPress={() => setSelectedMeetingId(null)}
                    >
                      <Text
                        style={[
                          styles.optionChipText,
                          selectedMeetingId === null && styles.optionChipTextSelected,
                        ]}
                      >
                        None
                      </Text>
                    </Pressable>
                    {meetings.map((mtg) => {
                      const isSelected = selectedMeetingId === mtg.id;
                      return (
                        <Pressable
                          key={mtg.id}
                          style={[styles.optionChip, isSelected && styles.optionChipSelected]}
                          onPress={() => setSelectedMeetingId(mtg.id)}
                        >
                          <Text
                            style={[
                              styles.optionChipText,
                              isSelected && styles.optionChipTextSelected,
                            ]}
                          >
                            {mtg.title}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              {milestones.length > 0 ? (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionLabel}>Linked Milestone (Optional)</Text>
                  <View style={styles.chipWrap}>
                    <Pressable
                      style={[
                        styles.optionChip,
                        selectedMilestoneId === null && styles.optionChipSelected,
                      ]}
                      onPress={() => setSelectedMilestoneId(null)}
                    >
                      <Text
                        style={[
                          styles.optionChipText,
                          selectedMilestoneId === null && styles.optionChipTextSelected,
                        ]}
                      >
                        None
                      </Text>
                    </Pressable>
                    {milestones.map((ms) => {
                      const isSelected = selectedMilestoneId === ms.id;
                      return (
                        <Pressable
                          key={ms.id}
                          style={[styles.optionChip, isSelected && styles.optionChipSelected]}
                          onPress={() => setSelectedMilestoneId(ms.id)}
                        >
                          <Text
                            style={[
                              styles.optionChipText,
                              isSelected && styles.optionChipTextSelected,
                            ]}
                          >
                            {ms.title}
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
                onPress={() => setIsModalVisible(false)}
                style={styles.modalBtn}
              />
              <Button
                title={supersedingTarget ? 'Confirm Supersede' : 'Save Decision'}
                variant="primary"
                size="md"
                loading={isSaving}
                onPress={handleSaveDecision}
                style={styles.modalBtn}
              />
            </View>
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
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  screenTitle: {
    ...typography.titleLarge,
    color: colors.textPrimary,
  },
  invariantCaption: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  summaryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  filterRow: {
    flexDirection: 'row',
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
    ...typography.label,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.surface,
  },
  emptyCard: {
    paddingVertical: spacing.lg,
  },
  decisionsList: {
    gap: spacing.md,
  },
  decisionCard: {
    padding: spacing.base,
    gap: spacing.sm,
  },
  decisionTopRow: {
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
  iconBtn: {
    padding: spacing.xs,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSubtle,
  },
  decisionTitle: {
    ...typography.titleMedium,
    color: colors.textPrimary,
  },
  decisionTitleSuperseded: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  decisionDesc: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  reasonBlock: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.md,
    padding: spacing.sm,
    gap: 2,
  },
  reasonLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  reasonBody: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  lineageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: colors.primaryLight,
  },
  lineageBoxWarning: {
    backgroundColor: colors.warningBg,
  },
  lineageText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    flex: 1,
  },
  lineageWarningText: {
    ...typography.caption,
    color: colors.warningText,
    fontWeight: '600',
    flex: 1,
  },
  decisionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  metaText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  footerBtns: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.base,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.titleMedium,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  modalScroll: {
    marginBottom: spacing.md,
  },
  supersedeNotice: {
    backgroundColor: colors.primaryLight,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  supersedeNoticeText: {
    ...typography.caption,
    color: colors.primary,
  },
  modalErrorText: {
    ...typography.caption,
    color: colors.dangerText,
    marginBottom: spacing.sm,
  },
  modalSection: {
    marginBottom: spacing.md,
  },
  modalSectionLabel: {
    ...typography.label,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
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
    fontWeight: '600',
  },
  optionChipTextSelected: {
    color: colors.primary,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalBtn: {
    flex: 1,
  },
});
