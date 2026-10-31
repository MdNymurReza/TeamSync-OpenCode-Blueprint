import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
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
  ErrorView,
  IconTile,
  LoadingView,
  ProgressBar,
  SectionHeader,
} from '@/components/ui';
import {
  projectsService,
  ProjectWithRole,
  ProjectMemberWithProfile,
  PROJECT_TYPE_OPTIONS,
} from '@/features/projects';
import { playbooksService, ProjectPhase } from '@/features/playbooks';
import { tasksService, TaskWithDetails } from '@/features/tasks';
import { milestonesService, MilestoneWithDetails } from '@/features/milestones';
import {
  formatMeetingDateTime,
  meetingsService,
  MeetingWithDetails,
} from '@/features/meetings';
import { decisionsService, DecisionWithDetails } from '@/features/decisions';
import {
  formatFileSize,
  resourcesService,
  ResourceWithDetails,
} from '@/features/resources';
import { ProjectInvitation } from '@/types/database';
import { colors, radii, spacing, touchTargets, typography } from '@/theme';

export default function ProjectDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [project, setProject] = useState<ProjectWithRole | null>(null);
  const [members, setMembers] = useState<ProjectMemberWithProfile[]>([]);
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [milestones, setMilestones] = useState<MilestoneWithDetails[]>([]);
  const [meetings, setMeetings] = useState<MeetingWithDetails[]>([]);
  const [decisions, setDecisions] = useState<DecisionWithDetails[]>([]);
  const [resources, setResources] = useState<ResourceWithDetails[]>([]);
  const [activeInvitation, setActiveInvitation] = useState<ProjectInvitation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setErrorMessage(null);

    const [
      projRes,
      membersRes,
      invitesRes,
      phasesRes,
      tasksRes,
      milestonesRes,
      meetingsRes,
      decisionsRes,
      resourcesRes,
    ] = await Promise.all([
      projectsService.fetchProjectDetails(id),
      projectsService.fetchProjectMembers(id),
      projectsService.fetchProjectInvitations(id),
      playbooksService.getProjectPhases(id),
      tasksService.fetchProjectTasks(id),
      milestonesService?.fetchProjectMilestones
        ? milestonesService.fetchProjectMilestones(id)
        : Promise.resolve({ data: [] as MilestoneWithDetails[], error: null }),
      meetingsService?.fetchProjectMeetings
        ? meetingsService.fetchProjectMeetings(id)
        : Promise.resolve({ data: [] as MeetingWithDetails[], error: null }),
      decisionsService?.fetchProjectDecisions
        ? decisionsService.fetchProjectDecisions(id)
        : Promise.resolve({ data: [] as DecisionWithDetails[], error: null }),
      resourcesService?.fetchProjectResources
        ? resourcesService.fetchProjectResources(id)
        : Promise.resolve({ data: [] as ResourceWithDetails[], error: null }),
    ]);

    if (projRes.error) {
      setErrorMessage(projRes.error.message);
    } else {
      setProject(projRes.data);
    }

    if (membersRes.data) {
      setMembers(membersRes.data);
    }

    if (invitesRes.data && invitesRes.data.length > 0) {
      setActiveInvitation(invitesRes.data[0] ?? null);
    } else {
      setActiveInvitation(null);
    }

    if (phasesRes.data) {
      setPhases(phasesRes.data);
    }

    if (tasksRes.data) {
      setTasks(tasksRes.data);
    }

    if (milestonesRes.data) {
      setMilestones(milestonesRes.data);
    }

    if (meetingsRes.data) {
      setMeetings(meetingsRes.data);
    }

    if (decisionsRes.data) {
      setDecisions(decisionsRes.data);
    }

    if (resourcesRes.data) {
      setResources(resourcesRes.data);
    }

    setIsLoading(false);
  }, [id]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!id) return;
      const [
        projRes,
        membersRes,
        invitesRes,
        phasesRes,
        tasksRes,
        milestonesRes,
        meetingsRes,
        decisionsRes,
        resourcesRes,
      ] = await Promise.all([
        projectsService.fetchProjectDetails(id),
        projectsService.fetchProjectMembers(id),
        projectsService.fetchProjectInvitations(id),
        playbooksService.getProjectPhases(id),
        tasksService.fetchProjectTasks(id),
        milestonesService?.fetchProjectMilestones
          ? milestonesService.fetchProjectMilestones(id)
          : Promise.resolve({ data: [] as MilestoneWithDetails[], error: null }),
        meetingsService?.fetchProjectMeetings
          ? meetingsService.fetchProjectMeetings(id)
          : Promise.resolve({ data: [] as MeetingWithDetails[], error: null }),
        decisionsService?.fetchProjectDecisions
          ? decisionsService.fetchProjectDecisions(id)
          : Promise.resolve({ data: [] as DecisionWithDetails[], error: null }),
        resourcesService?.fetchProjectResources
          ? resourcesService.fetchProjectResources(id)
          : Promise.resolve({ data: [] as ResourceWithDetails[], error: null }),
      ]);
      if (!isMounted) return;

      if (projRes.error) {
        setErrorMessage(projRes.error.message);
      } else {
        setProject(projRes.data);
      }
      if (membersRes.data) {
        setMembers(membersRes.data);
      }
      if (invitesRes.data && invitesRes.data.length > 0) {
        setActiveInvitation(invitesRes.data[0] ?? null);
      } else {
        setActiveInvitation(null);
      }
      if (phasesRes.data) {
        setPhases(phasesRes.data);
      }
      if (tasksRes.data) {
        setTasks(tasksRes.data);
      }
      if (milestonesRes.data) {
        setMilestones(milestonesRes.data);
      }
      if (meetingsRes.data) {
        setMeetings(meetingsRes.data);
      }
      if (decisionsRes.data) {
        setDecisions(decisionsRes.data);
      }
      if (resourcesRes.data) {
        setResources(resourcesRes.data);
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

  const handleGenerateInvite = async () => {
    if (!id) return;
    setIsGeneratingInvite(true);
    const { data: inv, error } = await projectsService.createInvitation({
      projectId: id,
      role: 'member',
      maxUses: 5,
      expiresInDays: 7,
    });
    setIsGeneratingInvite(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else if (inv) {
      setActiveInvitation(inv);
      Alert.alert(
        'Invite Code Created',
        `Code: ${inv.invitation_code}\n\nShare this code with teammates. It is valid for 7 days (up to ${inv.max_uses} uses).`
      );
    }
  };

  const handleArchiveToggle = () => {
    if (!project) return;
    const willArchive = !project.is_archived;
    Alert.alert(
      willArchive ? 'Archive Workspace' : 'Restore Workspace',
      willArchive
        ? 'Archiving hides the project from active views. Teammates can still view it in the Archived tab.'
        : 'Restore this workspace back to active projects?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: willArchive ? 'Archive' : 'Restore',
          style: willArchive ? 'destructive' : 'default',
          onPress: async () => {
            const { error } = await projectsService.setProjectArchived(project.id, willArchive);
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
    return <LoadingView message="Loading workspace details..." />;
  }

  if (errorMessage || !project) {
    return (
      <View style={styles.container}>
        <ErrorView
          title="Cannot load workspace"
          message={errorMessage ?? 'Workspace not found or access denied.'}
          onRetry={() => fetchData()}
          style={styles.errorContainer}
        />
      </View>
    );
  }

  const isOwnerOrAdmin =
    project.currentUserRole === 'owner' || project.currentUserRole === 'admin';
  const typeOpt = PROJECT_TYPE_OPTIONS.find((t) => t.type === project.project_type);
  const completedPhasesCount = phases.filter((p) => p.is_completed).length;
  const completedTasksCount = tasks.filter((t) => t.status === 'done').length;
  const overdueTasksCount = tasks.filter(
    (t) => t.due_date && t.due_date < new Date().toISOString() && t.status !== 'done'
  ).length;
  const completedMilestonesCount = milestones.filter(
    (m) => m.effectiveStatus === 'completed'
  ).length;
  const overdueMilestonesCount = milestones.filter((m) => m.isOverdue).length;

  return (
    <ScrollView
      style={styles.container}
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
      {/* Workspace Hero Card */}
      <Card style={styles.headerCard} variant="elevated">
        <View style={styles.headerTop}>
          <Badge
            label={typeOpt?.label ?? project.project_type}
            variant="default"
            icon={<Ionicons name="school-outline" size={14} color={colors.textSecondary} />}
          />
          <View style={styles.badgeRow}>
            {project.is_archived ? <Badge label="ARCHIVED" variant="warning" /> : null}
            <Badge
              label={`ROLE: ${project.currentUserRole.toUpperCase()}`}
              variant={project.currentUserRole === 'owner' ? 'primary' : 'info'}
            />
          </View>
        </View>

        <Text style={styles.projectName} accessibilityRole="header">
          {project.name}
        </Text>

        {project.description ? (
          <Text style={styles.projectDesc}>{project.description}</Text>
        ) : null}

        {(project.course_code || project.semester || project.target_date) ? (
          <View style={styles.metaRow}>
            {project.course_code ? (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Course</Text>
                <Text style={styles.metaValue}>{project.course_code}</Text>
              </View>
            ) : null}
            {project.semester ? (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Semester</Text>
                <Text style={styles.metaValue}>{project.semester}</Text>
              </View>
            ) : null}
            {project.target_date ? (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Target Deadline</Text>
                <Text style={styles.metaValue}>
                  {new Date(project.target_date).toLocaleDateString()}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </Card>

      {/* Invitation Card */}
      {isOwnerOrAdmin ? (
        <Card style={styles.inviteCard}>
          <View style={styles.inviteHeader}>
            <View style={styles.inviteHeaderLeft}>
              <IconTile name="key-outline" tone="primary" size={38} />
              <View style={styles.inviteHeaderTextCol}>
                <Text style={styles.cardSectionTitle}>Team Invitation</Text>
                <Text style={styles.cardSectionSubtitle}>
                  Invite teammates with an expiring join code
                </Text>
              </View>
            </View>
            <Button
              title={activeInvitation ? 'New Code' : 'Generate'}
              variant="soft"
              size="sm"
              loading={isGeneratingInvite}
              onPress={handleGenerateInvite}
            />
          </View>

          {activeInvitation ? (
            <View style={styles.inviteDisplay}>
              <View style={styles.codeBox}>
                <Text style={styles.codeText}>{activeInvitation.invitation_code}</Text>
              </View>
              <Text style={styles.inviteExpiryText}>
                Uses: {activeInvitation.uses_count}/{activeInvitation.max_uses} • Expires:{' '}
                {new Date(activeInvitation.expires_at).toLocaleDateString()}
              </Text>
            </View>
          ) : (
            <Text style={styles.noInviteText}>
              No active invitation code. Tap Generate to create one.
            </Text>
          )}
        </Card>
      ) : null}

      {/* Workflow Phases Section */}
      <Card style={styles.phasesCard}>
        <SectionHeader
          title={`Workflow Phases (${phases.length})`}
          action={
            <Button
              title="Manage"
              variant="text"
              size="sm"
              onPress={() => router.push(`/projects/${project.id}/phases` as Href)}
            />
          }
          style={styles.cardHeaderRow}
        />

        <Text style={styles.cardSectionSubtitle}>
          {completedPhasesCount} of {phases.length} completed
        </Text>

        {phases.length > 0 ? (
          <>
            <ProgressBar
              value={completedPhasesCount}
              total={phases.length}
              label="Workflow phases progress"
              tone={completedPhasesCount === phases.length ? 'success' : 'primary'}
            />
            <View style={styles.phasePreviewList}>
              {phases.slice(0, 4).map((phase, i) => (
                <View
                  key={phase.id}
                  style={[styles.phasePreviewRow, i > 0 && styles.rowBorder]}
                >
                  <View
                    style={[
                      styles.phaseStatusDot,
                      phase.is_completed ? styles.phaseStatusDotDone : null,
                    ]}
                  >
                    {phase.is_completed ? (
                      <Ionicons name="checkmark" size={12} color={colors.surface} />
                    ) : (
                      <Text style={styles.phaseNumberText}>{i + 1}</Text>
                    )}
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.phasePreviewTitle,
                      phase.is_completed ? styles.phasePreviewTitleDone : null,
                    ]}
                  >
                    {phase.name}
                  </Text>
                </View>
              ))}
              {phases.length > 4 ? (
                <Text style={styles.morePhasesText}>+ {phases.length - 4} more phases</Text>
              ) : null}
            </View>
          </>
        ) : (
          <Text style={styles.noPhasesText}>
            No phases configured. Tap Manage to set up playbook phases.
          </Text>
        )}
      </Card>

      {/* Milestones & Timeline Section */}
      <Card style={styles.phasesCard}>
        <SectionHeader
          title={`Milestones & Timeline (${milestones.length})`}
          action={
            <Button
              title="Timeline"
              variant="text"
              size="sm"
              onPress={() => router.push(`/projects/${project.id}/milestones` as Href)}
            />
          }
          style={styles.cardHeaderRow}
        />

        <Text style={styles.cardSectionSubtitle}>
          {completedMilestonesCount} of {milestones.length} completed
          {overdueMilestonesCount > 0 ? (
            <Text style={styles.overdueNotice}> • {overdueMilestonesCount} overdue</Text>
          ) : null}
        </Text>

        {milestones.length > 0 ? (
          <>
            <ProgressBar
              value={completedMilestonesCount}
              total={milestones.length}
              label="Milestones completion progress"
              tone={completedMilestonesCount === milestones.length ? 'success' : 'primary'}
            />
            <View style={styles.phasePreviewList}>
              {milestones.slice(0, 3).map((m, i) => (
                <Pressable
                  key={m.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Open milestone ${m.title}`}
                  style={({ pressed }) => [
                    styles.taskPreviewRow,
                    i > 0 && styles.rowBorder,
                    pressed && styles.rowPressed,
                  ]}
                  onPress={() => router.push(`/projects/${project.id}/milestones` as Href)}
                >
                  <View
                    style={[
                      styles.phaseStatusDot,
                      m.effectiveStatus === 'completed' ? styles.phaseStatusDotDone : null,
                    ]}
                  >
                    {m.effectiveStatus === 'completed' ? (
                      <Ionicons name="checkmark" size={12} color={colors.surface} />
                    ) : (
                      <Ionicons name="flag-outline" size={11} color={colors.primary} />
                    )}
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.phasePreviewTitle,
                      m.effectiveStatus === 'completed' ? styles.phasePreviewTitleDone : null,
                    ]}
                  >
                    {m.title}
                  </Text>
                  <Badge
                    label={`${m.progressPercent}%`}
                    variant={
                      m.isOverdue
                        ? 'danger'
                        : m.hasDeadlineRisk
                          ? 'warning'
                          : m.effectiveStatus === 'completed'
                            ? 'success'
                            : 'default'
                    }
                    size="sm"
                  />
                </Pressable>
              ))}
              {milestones.length > 3 ? (
                <Text style={styles.morePhasesText}>
                  + {milestones.length - 3} more milestones
                </Text>
              ) : null}
            </View>
          </>
        ) : (
          <Text style={styles.noPhasesText}>
            No milestones set yet. Tap Timeline to create project checkpoints.
          </Text>
        )}
      </Card>

      {/* Tasks Overview Section */}
      <Card style={styles.phasesCard}>
        <SectionHeader
          title={`Tasks & Deliverables (${tasks.length})`}
          action={
            <Button
              title="View All"
              variant="text"
              size="sm"
              onPress={() => router.push(`/projects/${project.id}/tasks` as Href)}
            />
          }
          style={styles.cardHeaderRow}
        />

        <Text style={styles.cardSectionSubtitle}>
          {completedTasksCount} of {tasks.length} completed
          {overdueTasksCount > 0 ? (
            <Text style={styles.overdueNotice}> • {overdueTasksCount} overdue</Text>
          ) : null}
        </Text>

        {tasks.length > 0 ? (
          <>
            <ProgressBar
              value={completedTasksCount}
              total={tasks.length}
              label="Tasks completion progress"
              tone={completedTasksCount === tasks.length ? 'success' : 'primary'}
            />
            <View style={styles.phasePreviewList}>
              {tasks.slice(0, 3).map((task, i) => (
                <Pressable
                  key={task.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Open task ${task.title}`}
                  style={({ pressed }) => [
                    styles.taskPreviewRow,
                    i > 0 && styles.rowBorder,
                    pressed && styles.rowPressed,
                  ]}
                  onPress={() => router.push(`/projects/${project.id}/tasks/${task.id}` as Href)}
                >
                  <View
                    style={[
                      styles.phaseStatusDot,
                      task.status === 'done' ? styles.phaseStatusDotDone : null,
                    ]}
                  >
                    {task.status === 'done' ? (
                      <Ionicons name="checkmark" size={12} color={colors.surface} />
                    ) : null}
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.phasePreviewTitle,
                      task.status === 'done' ? styles.phasePreviewTitleDone : null,
                    ]}
                  >
                    {task.title}
                  </Text>
                  <Badge
                    label={task.priority.toUpperCase()}
                    variant={task.priority === 'urgent' ? 'warning' : 'default'}
                    size="sm"
                  />
                </Pressable>
              ))}
              {tasks.length > 3 ? (
                <Text style={styles.morePhasesText}>+ {tasks.length - 3} more tasks</Text>
              ) : null}
            </View>
          </>
        ) : (
          <Text style={styles.noPhasesText}>
            No tasks created yet. Tap View All to create deliverables.
          </Text>
        )}
      </Card>

      {/* Meetings & Minutes Section */}
      <Card style={styles.phasesCard}>
        <SectionHeader
          title={`Meetings & Minutes (${meetings.length})`}
          action={
            <Button
              title="Meetings"
              variant="text"
              size="sm"
              onPress={() => router.push(`/projects/${project.id}/meetings` as Href)}
            />
          }
          style={styles.cardHeaderRow}
        />

        {meetings.length > 0 ? (
          <View style={styles.phasePreviewList}>
            {meetings.slice(0, 2).map((mtg, i) => (
              <Pressable
                key={mtg.id}
                accessibilityRole="button"
                accessibilityLabel={`Open meeting ${mtg.title}`}
                style={({ pressed }) => [
                  styles.taskPreviewRow,
                  i > 0 && styles.rowBorder,
                  pressed && styles.rowPressed,
                ]}
                onPress={() => router.push(`/projects/${project.id}/meetings` as Href)}
              >
                <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                <View style={styles.memberInfo}>
                  <Text numberOfLines={1} style={styles.phasePreviewTitle}>
                    {mtg.title}
                  </Text>
                  <Text style={styles.memberSub}>
                    {formatMeetingDateTime(mtg.starts_at)}
                  </Text>
                </View>
                <Badge
                  label={mtg.status.toUpperCase()}
                  variant={mtg.status === 'completed' ? 'success' : 'primary'}
                  size="sm"
                />
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.noPhasesText}>
            No meetings scheduled yet. Tap Meetings to schedule agendas and record minutes.
          </Text>
        )}
      </Card>

      {/* Decision Log Section */}
      <Card style={styles.phasesCard}>
        <SectionHeader
          title={`Decision Log (${decisions.length})`}
          action={
            <Button
              title="Decisions"
              variant="text"
              size="sm"
              onPress={() => router.push(`/projects/${project.id}/decisions` as Href)}
            />
          }
          style={styles.cardHeaderRow}
        />

        {decisions.length > 0 ? (
          <View style={styles.phasePreviewList}>
            {decisions.slice(0, 2).map((dec, i) => (
              <Pressable
                key={dec.id}
                accessibilityRole="button"
                accessibilityLabel={`Open decision ${dec.title}`}
                style={({ pressed }) => [
                  styles.taskPreviewRow,
                  i > 0 && styles.rowBorder,
                  pressed && styles.rowPressed,
                ]}
                onPress={() => router.push(`/projects/${project.id}/decisions` as Href)}
              >
                <Ionicons
                  name="git-pull-request-outline"
                  size={16}
                  color={colors.primary}
                />
                <Text numberOfLines={1} style={styles.phasePreviewTitle}>
                  {dec.title}
                </Text>
                <Badge
                  label={dec.status.toUpperCase()}
                  variant={
                    dec.status === 'accepted'
                      ? 'success'
                      : dec.status === 'proposed'
                        ? 'info'
                        : 'warning'
                  }
                  size="sm"
                />
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.noPhasesText}>
            No team decisions logged yet. Tap Decisions to record agreements and rationale.
          </Text>
        )}
      </Card>

      {/* Resource Hub Section */}
      <Card style={styles.phasesCard}>
        <SectionHeader
          title={`Resource Hub (${resources.length})`}
          action={
            <Button
              title="Resources"
              variant="text"
              size="sm"
              onPress={() => router.push(`/projects/${project.id}/resources` as Href)}
            />
          }
          style={styles.cardHeaderRow}
        />

        {resources.length > 0 ? (
          <View style={styles.phasePreviewList}>
            {resources.slice(0, 2).map((res, i) => (
              <Pressable
                key={res.id}
                accessibilityRole="button"
                accessibilityLabel={`Open resource ${res.title}`}
                style={({ pressed }) => [
                  styles.taskPreviewRow,
                  i > 0 && styles.rowBorder,
                  pressed && styles.rowPressed,
                ]}
                onPress={() => router.push(`/projects/${project.id}/resources` as Href)}
              >
                <Ionicons
                  name={
                    res.resource_type === 'file_upload'
                      ? 'document-lock-outline'
                      : 'link-outline'
                  }
                  size={16}
                  color={colors.primary}
                />
                <View style={styles.memberInfo}>
                  <Text numberOfLines={1} style={styles.phasePreviewTitle}>
                    {res.title}
                  </Text>
                  <Text style={styles.memberSub} numberOfLines={1}>
                    {res.resource_type === 'file_upload'
                      ? `${res.file_name ?? 'File'} • ${formatFileSize(res.file_size_bytes)}`
                      : res.external_url}
                  </Text>
                </View>
                <Badge
                  label={res.category.toUpperCase()}
                  variant={res.resource_type === 'file_upload' ? 'primary' : 'default'}
                  size="sm"
                />
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.noPhasesText}>
            No links or files shared yet. Tap Resources to add Drive/GitHub links or private uploads.
          </Text>
        )}
      </Card>

      {/* Members Section */}
      <Card style={styles.membersCard}>
        <SectionHeader
          title={`Team Members (${members.length})`}
          action={
            <Button
              title="Manage"
              variant="text"
              size="sm"
              onPress={() => router.push(`/projects/${project.id}/members` as Href)}
            />
          }
          style={styles.cardHeaderRow}
        />

        <View style={styles.memberList}>
          {members.map((m, i) => {
            const displayName = m.profile?.full_name ?? 'Team Member';
            return (
              <View key={m.id} style={[styles.memberRow, i > 0 && styles.rowBorder]}>
                <Avatar name={displayName} size={40} style={styles.avatarSpacing} />
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName} numberOfLines={1}>
                    {displayName}
                  </Text>
                  <Text style={styles.memberSub} numberOfLines={1}>
                    {m.profile?.university ?? m.profile?.email ?? 'Student'}
                  </Text>
                </View>
                <Badge
                  label={m.role.toUpperCase()}
                  variant={
                    m.role === 'owner' ? 'primary' : m.role === 'admin' ? 'info' : 'default'
                  }
                  size="sm"
                />
              </View>
            );
          })}
        </View>
      </Card>

      {/* Actions Section */}
      {isOwnerOrAdmin ? (
        <View style={styles.bottomActions}>
          <Button
            title={project.is_archived ? 'Restore Workspace' : 'Archive Workspace'}
            variant={project.is_archived ? 'secondary' : 'outline'}
            size="md"
            leftIcon={
              <Ionicons
                name={project.is_archived ? 'refresh-outline' : 'archive-outline'}
                size={18}
                color={project.is_archived ? colors.textPrimary : colors.primary}
              />
            }
            onPress={handleArchiveToggle}
          />
        </View>
      ) : null}
    </ScrollView>
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
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  projectName: {
    ...typography.titleLarge,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  projectDesc: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    flexWrap: 'wrap',
  },
  metaItem: {
    minWidth: 80,
  },
  metaLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: 2,
  },
  metaValue: {
    ...typography.label,
    color: colors.textPrimary,
  },
  inviteCard: {
    padding: spacing.base,
  },
  inviteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  inviteHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  inviteHeaderTextCol: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  cardHeaderRow: {
    marginBottom: 0,
  },
  cardSectionTitle: {
    ...typography.titleSmall,
    color: colors.textPrimary,
  },
  cardSectionSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
  },
  inviteDisplay: {
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  codeBox: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    marginBottom: spacing.xs,
  },
  codeText: {
    ...typography.titleLarge,
    letterSpacing: 4,
    color: colors.primary,
  },
  inviteExpiryText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  noInviteText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  phasesCard: {
    padding: spacing.base,
    gap: spacing.sm,
  },
  phasePreviewList: {
    marginTop: spacing.xs,
  },
  phasePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  taskPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: touchTargets.minTouchSize,
    paddingVertical: spacing.sm,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  rowPressed: {
    backgroundColor: colors.surfaceSubtle,
  },
  phaseStatusDot: {
    width: 22,
    height: 22,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.borderMuted,
  },
  phaseStatusDotDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  phaseNumberText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  phasePreviewTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    flex: 1,
  },
  phasePreviewTitleDone: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  morePhasesText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  noPhasesText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  overdueNotice: {
    color: colors.dangerText,
    fontWeight: '700',
  },
  membersCard: {
    padding: spacing.base,
  },
  memberList: {
    marginTop: spacing.xs,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  avatarSpacing: {
    marginRight: spacing.md,
  },
  memberInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  memberName: {
    ...typography.label,
    color: colors.textPrimary,
  },
  memberSub: {
    ...typography.caption,
    color: colors.textMuted,
  },
  bottomActions: {
    marginTop: spacing.xs,
  },
});
