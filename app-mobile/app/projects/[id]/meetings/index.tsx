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
  Avatar,
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
  formatMeetingDateTime,
  MEETING_STATUS_OPTIONS,
  MeetingActionItemWithDetails,
  MeetingListFilter,
  meetingsService,
  MeetingStatus,
  MeetingWithDetails,
  parseMeetingTimestamp,
} from '@/features/meetings';
import { playbooksService, ProjectPhase } from '@/features/playbooks';
import {
  ProjectMemberWithProfile,
  projectsService,
  ProjectWithRole,
} from '@/features/projects';
import { colors, radii, spacing, touchTargets, typography } from '@/theme';

export default function ProjectMeetingsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [project, setProject] = useState<ProjectWithRole | null>(null);
  const [meetings, setMeetings] = useState<MeetingWithDetails[]>([]);
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [members, setMembers] = useState<ProjectMemberWithProfile[]>([]);
  const [activeFilter, setActiveFilter] = useState<MeetingListFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Schedule / Edit Meeting Modal State
  const [isScheduleModalVisible, setIsScheduleModalVisible] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<MeetingWithDetails | null>(null);
  const [title, setTitle] = useState('');
  const [dateText, setDateText] = useState('');
  const [timeText, setTimeText] = useState('10:00');
  const [locationOrLink, setLocationOrLink] = useState('');
  const [agenda, setAgenda] = useState('');
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSavingMeeting, setIsSavingMeeting] = useState(false);

  // Minutes & Action Items Modal State
  const [activeMinutesMeeting, setActiveMinutesMeeting] = useState<MeetingWithDetails | null>(
    null
  );
  const [minutesText, setMinutesText] = useState('');
  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);
  const [minutesStatus, setMinutesStatus] = useState<MeetingStatus>('completed');
  const [isSavingMinutes, setIsSavingMinutes] = useState(false);

  // New Action Item Input State
  const [newActionTitle, setNewActionTitle] = useState('');
  const [newActionAssigneeId, setNewActionAssigneeId] = useState<string | null>(null);
  const [newActionDueDate, setNewActionDueDate] = useState('');
  const [actionItemError, setActionItemError] = useState<string | null>(null);
  const [isAddingActionItem, setIsAddingActionItem] = useState(false);
  const [convertingActionId, setConvertingActionId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setErrorMessage(null);

    const [projRes, meetingsRes, phasesRes, membersRes] = await Promise.all([
      projectsService.fetchProjectDetails(id),
      meetingsService.fetchProjectMeetings(id, activeFilter),
      playbooksService.getProjectPhases(id),
      projectsService.fetchProjectMembers(id),
    ]);

    if (projRes.error) {
      setErrorMessage(projRes.error.message);
    } else {
      setProject(projRes.data);
    }

    if (meetingsRes.error) {
      setErrorMessage(meetingsRes.error.message);
    } else {
      const loaded = meetingsRes.data ?? [];
      setMeetings(loaded);
      setActiveMinutesMeeting((prev) =>
        prev ? loaded.find((m) => m.id === prev.id) ?? prev : null
      );
    }

    if (phasesRes.data) {
      setPhases(phasesRes.data);
    }

    if (membersRes.data) {
      setMembers(membersRes.data);
    }

    setIsLoading(false);
  }, [id, activeFilter]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!id) return;
      const [projRes, meetingsRes, phasesRes, membersRes] = await Promise.all([
        projectsService.fetchProjectDetails(id),
        meetingsService.fetchProjectMeetings(id, activeFilter),
        playbooksService.getProjectPhases(id),
        projectsService.fetchProjectMembers(id),
      ]);
      if (!isMounted) return;

      if (projRes.error) {
        setErrorMessage(projRes.error.message);
      } else {
        setProject(projRes.data);
      }
      if (meetingsRes.error) {
        setErrorMessage(meetingsRes.error.message);
      } else {
        setMeetings(meetingsRes.data ?? []);
      }
      if (phasesRes.data) {
        setPhases(phasesRes.data);
      }
      if (membersRes.data) {
        setMembers(membersRes.data);
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
    setEditingMeeting(null);
    setTitle('');
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    setDateText(tomorrow);
    setTimeText('10:00');
    setLocationOrLink('');
    setAgenda('');
    setSelectedPhaseId(null);
    setFormError(null);
    setIsScheduleModalVisible(true);
  };

  const openEditModal = (meeting: MeetingWithDetails) => {
    setEditingMeeting(meeting);
    setTitle(meeting.title);
    setDateText(meeting.starts_at.slice(0, 10));
    setTimeText(meeting.starts_at.slice(11, 16) || '10:00');
    setLocationOrLink(meeting.location_or_link ?? '');
    setAgenda(meeting.agenda ?? '');
    setSelectedPhaseId(meeting.phase_id);
    setFormError(null);
    setIsScheduleModalVisible(true);
  };

  const handleSaveMeeting = async () => {
    if (!id) return;
    if (!title.trim()) {
      setFormError('Meeting title is required');
      return;
    }

    const parsed = parseMeetingTimestamp(dateText, timeText);
    if (parsed.error || !parsed.iso) {
      setFormError(parsed.error ?? 'Invalid meeting date/time');
      return;
    }

    setIsSavingMeeting(true);
    if (editingMeeting) {
      const { error } = await meetingsService.updateMeeting(editingMeeting.id, {
        title: title.trim(),
        starts_at: parsed.iso,
        location_or_link: locationOrLink.trim() || null,
        agenda: agenda.trim() || null,
        phase_id: selectedPhaseId,
      });
      setIsSavingMeeting(false);

      if (error) {
        setFormError(error.message);
      } else {
        setIsScheduleModalVisible(false);
        setEditingMeeting(null);
        fetchData();
      }
    } else {
      const { error } = await meetingsService.createMeeting(id, {
        title: title.trim(),
        starts_at: parsed.iso,
        location_or_link: locationOrLink.trim() || undefined,
        agenda: agenda.trim() || undefined,
        phase_id: selectedPhaseId,
      });
      setIsSavingMeeting(false);

      if (error) {
        setFormError(error.message);
      } else {
        setIsScheduleModalVisible(false);
        fetchData();
      }
    }
  };

  const openMinutesModal = (meeting: MeetingWithDetails) => {
    setActiveMinutesMeeting(meeting);
    setMinutesText(meeting.minutes_summary ?? '');
    setAttendeeIds(meeting.attendee_ids ?? []);
    setMinutesStatus(
      meeting.status === 'scheduled' ? 'completed' : meeting.status
    );
    setNewActionTitle('');
    setNewActionAssigneeId(null);
    setNewActionDueDate('');
    setActionItemError(null);
  };

  const toggleAttendee = (userId: string) => {
    setAttendeeIds((prev) =>
      prev.includes(userId) ? prev.filter((u) => u !== userId) : [...prev, userId]
    );
  };

  const handleSaveMinutes = async () => {
    if (!activeMinutesMeeting) return;
    setIsSavingMinutes(true);
    const { error } = await meetingsService.updateMeeting(activeMinutesMeeting.id, {
      minutes_summary: minutesText.trim() || null,
      attendee_ids: attendeeIds,
      status: minutesStatus,
    });
    setIsSavingMinutes(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setActiveMinutesMeeting(null);
      fetchData();
    }
  };

  const handleAddActionItem = async () => {
    if (!activeMinutesMeeting || !id) return;
    if (!newActionTitle.trim()) {
      setActionItemError('Action item title is required');
      return;
    }

    let parsedDueDate: string | null = null;
    if (newActionDueDate.trim()) {
      const parsed = parseMeetingTimestamp(newActionDueDate.trim(), '17:00');
      if (parsed.error || !parsed.iso) {
        setActionItemError('Enter due date as YYYY-MM-DD');
        return;
      }
      parsedDueDate = parsed.iso;
    }

    setActionItemError(null);
    setIsAddingActionItem(true);
    const { data, error } = await meetingsService.addActionItem(
      activeMinutesMeeting.id,
      id,
      {
        title: newActionTitle.trim(),
        assignee_id: newActionAssigneeId,
        due_date: parsedDueDate,
      }
    );
    setIsAddingActionItem(false);

    if (error) {
      setActionItemError(error.message);
    } else if (data) {
      setNewActionTitle('');
      setNewActionAssigneeId(null);
      setNewActionDueDate('');
      await fetchData();
    }
  };

  const handleConvertToTask = async (
    meeting: MeetingWithDetails,
    item: MeetingActionItemWithDetails
  ) => {
    setConvertingActionId(item.id);
    const { data, error } = await meetingsService.convertActionItemToTask(
      item,
      meeting.title,
      meeting.phase_id
    );
    setConvertingActionId(null);

    if (error) {
      Alert.alert('Conversion Failed', error.message);
    } else if (data) {
      await fetchData();
    }
  };

  const handleToggleActionItemDone = async (item: MeetingActionItemWithDetails) => {
    const { error } = await meetingsService.updateActionItem(item.id, {
      is_completed: !item.is_completed,
    });
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      await fetchData();
    }
  };

  const handleDeleteMeeting = (meeting: MeetingWithDetails) => {
    Alert.alert(
      'Delete Meeting',
      `Are you sure you want to delete "${meeting.title}"? Converted tasks will remain on the task board.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await meetingsService.deleteMeeting(meeting.id);
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
    return <LoadingView message="Loading meetings & minutes..." />;
  }

  if (errorMessage || !project) {
    return (
      <View style={styles.container}>
        <ErrorView
          title="Cannot load meetings"
          message={errorMessage ?? 'Project not found.'}
          onRetry={() => fetchData()}
          style={styles.errorContainer}
        />
      </View>
    );
  }

  const scheduledCount = meetings.filter((m) => m.status === 'scheduled').length;
  const completedCount = meetings.filter((m) => m.status === 'completed').length;

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
        {/* Summary Header Card */}
        <Card style={styles.summaryCard} variant="elevated">
          <View style={styles.summaryHeader}>
            <View style={styles.summaryTitleCol}>
              <Text style={styles.projectSubtitle}>{project.name}</Text>
              <Text style={styles.screenTitle} accessibilityRole="header">
                Meetings & Minutes
              </Text>
            </View>
            <Button
              title="Schedule"
              variant="primary"
              size="sm"
              leftIcon={<Ionicons name="add" size={16} color={colors.surface} />}
              onPress={openCreateModal}
              accessibilityLabel="Schedule new meeting"
            />
          </View>

          <View style={styles.summaryMetaRow}>
            <Badge label={`${scheduledCount} Scheduled`} variant="primary" size="sm" />
            <Badge label={`${completedCount} Completed`} variant="success" size="sm" />
            <Pressable
              onPress={() => router.push(`/projects/${project.id}/decisions` as Href)}
              accessibilityRole="button"
              accessibilityLabel="Open project decision log"
              style={styles.decisionLinkPill}
            >
              <Ionicons name="git-pull-request-outline" size={14} color={colors.primary} />
              <Text style={styles.decisionLinkText}>Decision Log</Text>
            </Pressable>
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
              { key: 'completed', label: 'Past & Completed' },
              { key: 'cancelled', label: 'Cancelled' },
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
                accessibilityLabel={`Filter ${tab.label} meetings`}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Meetings List */}
        {meetings.length === 0 ? (
          <Card style={styles.emptyCard}>
            <EmptyState
              title="No meetings scheduled"
              description={
                activeFilter !== 'all'
                  ? `No meetings match the "${activeFilter}" filter.`
                  : 'Schedule a team sync to track agendas, minutes, and action items.'
              }
              icon={<Ionicons name="people-outline" size={38} color={colors.primary} />}
              actionTitle="Schedule Meeting"
              onAction={openCreateModal}
            />
          </Card>
        ) : (
          <View style={styles.meetingsList}>
            {meetings.map((m) => {
              const statusOpt =
                MEETING_STATUS_OPTIONS.find((o) => o.status === m.status) ?? {
                  status: 'scheduled' as const,
                  label: 'Scheduled',
                  badgeVariant: 'primary' as const,
                };
              const canDelete = isOwnerOrAdmin || m.created_by === user?.id;

              return (
                <Card key={m.id} style={styles.meetingCard}>
                  <View style={styles.meetingTopRow}>
                    <View style={styles.badgeWrap}>
                      <Badge
                        label={statusOpt.label}
                        variant={statusOpt.badgeVariant}
                        size="sm"
                      />
                      {m.phase ? (
                        <Badge label={m.phase.name} variant="info" size="sm" />
                      ) : null}
                      {m.attendee_ids.length > 0 ? (
                        <Badge
                          label={`${m.attendee_ids.length} attended`}
                          variant="default"
                          size="sm"
                        />
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
                          onPress={() => handleDeleteMeeting(m)}
                          accessibilityRole="button"
                          accessibilityLabel={`Delete ${m.title}`}
                        >
                          <Ionicons name="trash-outline" size={16} color={colors.danger} />
                        </Pressable>
                      ) : null}
                    </View>
                  </View>

                  <Text style={styles.meetingTitle}>{m.title}</Text>

                  <View style={styles.metaLine}>
                    <Ionicons name="time-outline" size={14} color={colors.primary} />
                    <Text style={styles.metaLineText}>
                      {formatMeetingDateTime(m.starts_at)}
                    </Text>
                  </View>

                  {m.location_or_link ? (
                    <View style={styles.metaLine}>
                      <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                      <Text style={styles.metaLineText} numberOfLines={1}>
                        {m.location_or_link}
                      </Text>
                    </View>
                  ) : null}

                  {m.agenda ? (
                    <View style={styles.sectionBlock}>
                      <Text style={styles.sectionBlockLabel}>Agenda</Text>
                      <Text style={styles.sectionBlockBody}>{m.agenda}</Text>
                    </View>
                  ) : null}

                  {m.minutes_summary ? (
                    <View style={styles.sectionBlock}>
                      <Text style={styles.sectionBlockLabel}>Meeting Minutes</Text>
                      <Text style={styles.sectionBlockBody}>{m.minutes_summary}</Text>
                    </View>
                  ) : null}

                  {/* Action Items Preview & One-Tap Task Conversion */}
                  {m.action_items.length > 0 ? (
                    <View style={styles.actionItemsSection}>
                      <Text style={styles.sectionBlockLabel}>
                        Action Items ({m.action_items_completed}/{m.action_items_total})
                      </Text>
                      {m.action_items.map((item) => {
                        const isConverted = Boolean(item.converted_task_id);
                        return (
                          <View key={item.id} style={styles.actionItemRow}>
                            <Pressable
                              onPress={() => handleToggleActionItemDone(item)}
                              accessibilityRole="checkbox"
                              accessibilityState={{ checked: item.is_completed }}
                              accessibilityLabel={`Toggle action item ${item.title}`}
                              style={styles.actionCheckBtn}
                            >
                              <Ionicons
                                name={
                                  item.is_completed
                                    ? 'checkmark-circle'
                                    : 'ellipse-outline'
                                }
                                size={20}
                                color={
                                  item.is_completed ? colors.success : colors.textMuted
                                }
                              />
                            </Pressable>
                            <View style={styles.actionItemTextCol}>
                              <Text
                                style={[
                                  styles.actionItemTitle,
                                  item.is_completed && styles.actionItemTitleDone,
                                ]}
                              >
                                {item.title}
                              </Text>
                              {item.assignee?.full_name ? (
                                <Text style={styles.actionItemSub}>
                                  Owner: {item.assignee.full_name}
                                </Text>
                              ) : null}
                            </View>
                            {isConverted ? (
                              <Pressable
                                onPress={() =>
                                  router.push(
                                    `/projects/${project.id}/tasks/${item.converted_task_id}` as Href
                                  )
                                }
                                accessibilityRole="button"
                                accessibilityLabel={`View converted task for ${item.title}`}
                              >
                                <Badge label="Task Created" variant="success" size="sm" />
                              </Pressable>
                            ) : (
                              <Button
                                title="Convert to Task"
                                variant="soft"
                                size="sm"
                                loading={convertingActionId === item.id}
                                onPress={() => handleConvertToTask(m, item)}
                                accessibilityLabel={`Convert ${item.title} to task`}
                              />
                            )}
                          </View>
                        );
                      })}
                    </View>
                  ) : null}

                  <View style={styles.meetingFooter}>
                    <Button
                      title={
                        m.minutes_summary
                          ? 'Edit Minutes & Action Items'
                          : 'Record Minutes & Action Items'
                      }
                      variant="outline"
                      size="sm"
                      leftIcon={
                        <Ionicons
                          name="document-text-outline"
                          size={15}
                          color={colors.primary}
                        />
                      }
                      onPress={() => openMinutesModal(m)}
                      accessibilityLabel={`Record minutes for ${m.title}`}
                    />
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Schedule / Edit Meeting Modal */}
      <Modal
        visible={isScheduleModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsScheduleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingMeeting ? 'Edit Meeting' : 'Schedule Meeting'}
              </Text>
              <Pressable
                hitSlop={10}
                onPress={() => setIsScheduleModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close schedule modal"
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              {formError ? <Text style={styles.modalErrorText}>{formError}</Text> : null}

              <Input
                label="Meeting Title *"
                placeholder="e.g. Sprint 2 Planning & Architecture Sync"
                value={title}
                onChangeText={setTitle}
                autoFocus
              />

              <Input
                label="Meeting Date (YYYY-MM-DD) *"
                placeholder="2026-11-15"
                value={dateText}
                onChangeText={setDateText}
              />

              <Input
                label="Start Time (24h HH:MM UTC) *"
                placeholder="14:30"
                value={timeText}
                onChangeText={setTimeText}
              />

              <Input
                label="Location or Meeting Link (Optional)"
                placeholder="Room 402 or Google Meet / Zoom URL"
                value={locationOrLink}
                onChangeText={setLocationOrLink}
              />

              <Input
                label="Agenda (Optional)"
                placeholder="Key topics and questions to cover"
                value={agenda}
                onChangeText={setAgenda}
                multiline
                numberOfLines={3}
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
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <Button
                title="Cancel"
                variant="secondary"
                size="md"
                onPress={() => setIsScheduleModalVisible(false)}
                style={styles.modalBtn}
              />
              <Button
                title={editingMeeting ? 'Save Changes' : 'Schedule Meeting'}
                variant="primary"
                size="md"
                loading={isSavingMeeting}
                onPress={handleSaveMeeting}
                style={styles.modalBtn}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Minutes, Optional Attendance & Action Items Modal */}
      <Modal
        visible={Boolean(activeMinutesMeeting)}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveMinutesMeeting(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                Minutes: {activeMinutesMeeting?.title ?? ''}
              </Text>
              <Pressable
                hitSlop={10}
                onPress={() => setActiveMinutesMeeting(null)}
                accessibilityRole="button"
                accessibilityLabel="Close minutes modal"
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              {/* Meeting Status */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionLabel}>Meeting Status</Text>
                <View style={styles.chipWrap}>
                  {MEETING_STATUS_OPTIONS.map((opt) => {
                    const isSelected = minutesStatus === opt.status;
                    return (
                      <Pressable
                        key={opt.status}
                        style={[styles.optionChip, isSelected && styles.optionChipSelected]}
                        onPress={() => setMinutesStatus(opt.status)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        accessibilityLabel={`Set meeting status to ${opt.label}`}
                      >
                        <Text
                          style={[
                            styles.optionChipText,
                            isSelected && styles.optionChipTextSelected,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Optional Attendance Record (never used as ranking) */}
              {members.length > 0 ? (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionLabel}>Optional Attendance</Text>
                  <Text style={styles.privacyHint}>
                    For team coordination only — never used for productivity scoring.
                  </Text>
                  <View style={styles.chipWrap}>
                    {members.map((m) => {
                      const name = m.profile?.full_name ?? 'Member';
                      const isPresent = attendeeIds.includes(m.user_id);
                      return (
                        <Pressable
                          key={m.user_id}
                          style={[styles.optionChip, isPresent && styles.optionChipSelected]}
                          onPress={() => toggleAttendee(m.user_id)}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: isPresent }}
                          accessibilityLabel={`Mark ${name} as attended`}
                        >
                          <Avatar name={name} size={20} />
                          <Text
                            style={[
                              styles.optionChipText,
                              isPresent && styles.optionChipTextSelected,
                            ]}
                          >
                            {name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              <Input
                label="Minutes Summary"
                placeholder="Record key takeaways, blockers discussed, and agreements..."
                value={minutesText}
                onChangeText={setMinutesText}
                multiline
                numberOfLines={4}
              />

              {/* Add Structured Action Item */}
              <View style={styles.addActionBox}>
                <Text style={styles.modalSectionLabel}>Add Action Item</Text>
                {actionItemError ? (
                  <Text style={styles.modalErrorText}>{actionItemError}</Text>
                ) : null}

                <Input
                  label="Action Item *"
                  placeholder="e.g. Draft API contract for review"
                  value={newActionTitle}
                  onChangeText={setNewActionTitle}
                />

                <Input
                  label="Due Date (Optional YYYY-MM-DD)"
                  placeholder="2026-11-20"
                  value={newActionDueDate}
                  onChangeText={setNewActionDueDate}
                />

                {members.length > 0 ? (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionLabel}>Assignee (Optional)</Text>
                    <View style={styles.chipWrap}>
                      <Pressable
                        style={[
                          styles.optionChip,
                          newActionAssigneeId === null && styles.optionChipSelected,
                        ]}
                        onPress={() => setNewActionAssigneeId(null)}
                      >
                        <Text
                          style={[
                            styles.optionChipText,
                            newActionAssigneeId === null && styles.optionChipTextSelected,
                          ]}
                        >
                          Unassigned
                        </Text>
                      </Pressable>
                      {members.map((m) => {
                        const name = m.profile?.full_name ?? 'Member';
                        const isSelected = newActionAssigneeId === m.user_id;
                        return (
                          <Pressable
                            key={m.user_id}
                            style={[styles.optionChip, isSelected && styles.optionChipSelected]}
                            onPress={() => setNewActionAssigneeId(m.user_id)}
                          >
                            <Text
                              style={[
                                styles.optionChipText,
                                isSelected && styles.optionChipTextSelected,
                              ]}
                            >
                              {name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ) : null}

                <Button
                  title="Add Action Item"
                  variant="soft"
                  size="sm"
                  loading={isAddingActionItem}
                  onPress={handleAddActionItem}
                  accessibilityLabel="Add action item to meeting"
                />
              </View>
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <Button
                title="Close"
                variant="secondary"
                size="md"
                onPress={() => setActiveMinutesMeeting(null)}
                style={styles.modalBtn}
              />
              <Button
                title="Save Minutes"
                variant="primary"
                size="md"
                loading={isSavingMinutes}
                onPress={handleSaveMinutes}
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
  summaryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  decisionLinkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.full,
    backgroundColor: colors.primaryLight,
  },
  decisionLinkText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
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
  meetingsList: {
    gap: spacing.md,
  },
  meetingCard: {
    padding: spacing.base,
    gap: spacing.sm,
  },
  meetingTopRow: {
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
    padding: spacing.xs,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSubtle,
  },
  meetingTitle: {
    ...typography.titleMedium,
    color: colors.textPrimary,
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaLineText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  sectionBlock: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.md,
    padding: spacing.sm,
    gap: 4,
  },
  sectionBlockLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sectionBlockBody: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  actionItemsSection: {
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    gap: spacing.xs,
  },
  actionItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxs,
    minHeight: touchTargets.minTouchSize,
  },
  actionCheckBtn: {
    padding: 2,
  },
  actionItemTextCol: {
    flex: 1,
  },
  actionItemTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  actionItemTitleDone: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  actionItemSub: {
    ...typography.caption,
    color: colors.textMuted,
  },
  meetingFooter: {
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    alignItems: 'flex-start',
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
  privacyHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  addActionBox: {
    padding: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xs,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalBtn: {
    flex: 1,
  },
});
