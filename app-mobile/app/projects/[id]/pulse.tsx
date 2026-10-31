import React, { useCallback, useEffect, useState } from 'react';
import {
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
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorView,
  Input,
  LoadingView,
} from '@/components/ui';
import { projectsService, ProjectWithRole } from '@/features/projects';
import {
  getWeekStartDateIso,
  pulseService,
  summarizeTeamPulse,
  TEAM_PULSE_STATUS_OPTIONS,
  TeamPulseCheckinWithProfile,
  TeamPulseStatus,
} from '@/features/pulse';
import { colors, radii, spacing, typography } from '@/theme';

export default function ProjectPulseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [project, setProject] = useState<ProjectWithRole | null>(null);
  const [checkins, setCheckins] = useState<TeamPulseCheckinWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check-in Modal State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<TeamPulseStatus>('on_track');
  const [blockerDetails, setBlockerDetails] = useState('');
  const [followUpNote, setFollowUpNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const currentWeekStart = getWeekStartDateIso();

  const fetchData = useCallback(async () => {
    if (!id) return;
    setErrorMessage(null);

    const [projRes, pulseRes] = await Promise.all([
      projectsService.fetchProjectDetails(id),
      pulseService.fetchProjectPulseCheckins(id),
    ]);

    if (projRes.error) {
      setErrorMessage(projRes.error.message);
    } else {
      setProject(projRes.data);
    }

    if (pulseRes.error) {
      setErrorMessage(pulseRes.error.message);
    } else {
      setCheckins(pulseRes.data ?? []);
    }

    setIsLoading(false);
  }, [id]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!id) return;
      const [projRes, pulseRes] = await Promise.all([
        projectsService.fetchProjectDetails(id),
        pulseService.fetchProjectPulseCheckins(id),
      ]);
      if (!isMounted) return;

      if (projRes.error) {
        setErrorMessage(projRes.error.message);
      } else {
        setProject(projRes.data);
      }
      if (pulseRes.error) {
        setErrorMessage(pulseRes.error.message);
      } else {
        setCheckins(pulseRes.data ?? []);
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

  const openCheckinModal = () => {
    setSelectedStatus('on_track');
    setBlockerDetails('');
    setFollowUpNote('');
    setFormError(null);
    setIsModalVisible(true);
  };

  const handleSaveCheckin = async () => {
    if (!id) return;
    setFormError(null);
    setIsSaving(true);

    const { error } = await pulseService.submitPulseCheckin(id, {
      status: selectedStatus,
      blocker_details: blockerDetails.trim() || null,
      follow_up_note: followUpNote.trim() || null,
      week_start_date: currentWeekStart,
    });
    setIsSaving(false);

    if (error) {
      setFormError(error.message);
    } else {
      setIsModalVisible(false);
      fetchData();
    }
  };

  if (isLoading && !isRefreshing) {
    return <LoadingView message="Loading Team Pulse..." />;
  }

  if (errorMessage || !project) {
    return (
      <View style={styles.container}>
        <ErrorView
          title="Cannot load Team Pulse"
          message={errorMessage ?? 'Project not found.'}
          onRetry={() => fetchData()}
          style={styles.errorContainer}
        />
      </View>
    );
  }

  const summary = summarizeTeamPulse(checkins);

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
        {/* Summary & Non-Ranking Privacy Banner */}
        <Card style={styles.summaryCard} variant="elevated">
          <View style={styles.summaryHeader}>
            <View style={styles.summaryTitleCol}>
              <Text style={styles.projectSubtitle}>{project.name}</Text>
              <Text style={styles.screenTitle} accessibilityRole="header">
                Team Pulse
              </Text>
            </View>
            <Button
              title="Submit Check-in"
              variant="primary"
              size="sm"
              leftIcon={
                <Ionicons name="heart-half-outline" size={16} color={colors.surface} />
              }
              onPress={openCheckinModal}
              accessibilityLabel="Submit weekly Team Pulse check-in"
            />
          </View>

          <Text style={styles.privacyNotice}>
            Optional weekly check-ins help teammates spot blockers and offer support early.
            Self-reports are never used as verified productivity measures or member rankings.
          </Text>

          <View style={styles.summaryMetaRow}>
            <Badge
              label={`${summary.onTrackCount} On Track`}
              variant="success"
              size="sm"
            />
            <Badge
              label={`${summary.needsSupportCount} Needs Support`}
              variant="warning"
              size="sm"
            />
            <Badge
              label={`${summary.blockedCount} Blocked`}
              variant="danger"
              size="sm"
            />
          </View>
        </Card>

        {/* Check-ins List */}
        {checkins.length === 0 ? (
          <Card style={styles.emptyCard}>
            <EmptyState
              title="No pulse check-ins yet"
              description="Share a quick weekly check-in to let your teammates know if you are on track, need support, or hit a blocker."
              icon={
                <Ionicons name="heart-half-outline" size={38} color={colors.primary} />
              }
              actionTitle="Submit Check-in"
              onAction={openCheckinModal}
            />
          </Card>
        ) : (
          <View style={styles.checkinsList}>
            {checkins.map((item) => {
              const statusOpt =
                TEAM_PULSE_STATUS_OPTIONS.find((o) => o.status === item.status) ?? {
                  status: 'on_track' as const,
                  label: 'On Track',
                  description: '',
                  badgeVariant: 'success' as const,
                  icon: 'checkmark-circle-outline',
                };
              const memberName = item.user?.full_name ?? 'Team Member';

              return (
                <Card key={item.id} style={styles.checkinCard}>
                  <View style={styles.checkinHeader}>
                    <View style={styles.memberRow}>
                      <Avatar
                        name={memberName}
                        avatarUrl={item.user?.avatar_url}
                        size={36}
                      />
                      <View style={styles.memberTextCol}>
                        <Text style={styles.memberName}>{memberName}</Text>
                        <Text style={styles.weekText}>
                          Week of {item.week_start_date}
                        </Text>
                      </View>
                    </View>
                    <Badge
                      label={statusOpt.label}
                      variant={statusOpt.badgeVariant}
                      size="sm"
                    />
                  </View>

                  {item.blocker_details ? (
                    <View style={styles.detailBox}>
                      <Text style={styles.detailBoxLabel}>Blocker / Support Needed</Text>
                      <Text style={styles.detailBoxBody}>{item.blocker_details}</Text>
                    </View>
                  ) : null}

                  {item.follow_up_note ? (
                    <View style={styles.detailBox}>
                      <Text style={styles.detailBoxLabel}>Follow-up Plan</Text>
                      <Text style={styles.detailBoxBody}>{item.follow_up_note}</Text>
                    </View>
                  ) : null}
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Submit Weekly Check-in Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Weekly Team Pulse ({currentWeekStart})
              </Text>
              <Pressable
                hitSlop={10}
                onPress={() => setIsModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close pulse modal"
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              {formError ? <Text style={styles.modalErrorText}>{formError}</Text> : null}

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionLabel}>How is your week going?</Text>
                <View style={styles.statusChoicesCol}>
                  {TEAM_PULSE_STATUS_OPTIONS.map((opt) => {
                    const isSelected = selectedStatus === opt.status;
                    return (
                      <Pressable
                        key={opt.status}
                        onPress={() => setSelectedStatus(opt.status)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        accessibilityLabel={`Select pulse status ${opt.label}`}
                        style={[
                          styles.statusChoiceCard,
                          isSelected && styles.statusChoiceCardSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusChoiceTitle,
                            isSelected && styles.statusChoiceTitleSelected,
                          ]}
                        >
                          {opt.label}
                        </Text>
                        <Text style={styles.statusChoiceDesc}>{opt.description}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <Input
                label="Blocker or Support Details (Optional)"
                placeholder="What is blocking you or where can a teammate help?"
                value={blockerDetails}
                onChangeText={setBlockerDetails}
                multiline
                numberOfLines={3}
              />

              <Input
                label="Follow-up Summary (Optional)"
                placeholder="Next step or pair session planned..."
                value={followUpNote}
                onChangeText={setFollowUpNote}
                multiline
                numberOfLines={2}
              />
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
                title="Save Check-in"
                variant="primary"
                size="md"
                loading={isSaving}
                onPress={handleSaveCheckin}
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
  privacyNotice: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  summaryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  emptyCard: {
    paddingVertical: spacing.lg,
  },
  checkinsList: {
    gap: spacing.md,
  },
  checkinCard: {
    padding: spacing.base,
    gap: spacing.sm,
  },
  checkinHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  memberTextCol: {
    flex: 1,
  },
  memberName: {
    ...typography.label,
    color: colors.textPrimary,
  },
  weekText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  detailBox: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.md,
    padding: spacing.sm,
    gap: 2,
  },
  detailBoxLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  detailBoxBody: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
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
  statusChoicesCol: {
    gap: spacing.xs,
  },
  statusChoiceCard: {
    padding: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusChoiceCardSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  statusChoiceTitle: {
    ...typography.label,
    color: colors.textPrimary,
  },
  statusChoiceTitleSelected: {
    color: colors.primary,
  },
  statusChoiceDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalBtn: {
    flex: 1,
  },
});

