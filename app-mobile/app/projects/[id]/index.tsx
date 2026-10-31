import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Badge, Button, Card, ErrorView, LoadingView } from '@/components/ui';
import {
  projectsService,
  ProjectWithRole,
  ProjectMemberWithProfile,
  PROJECT_TYPE_OPTIONS,
} from '@/features/projects';
import { playbooksService, ProjectPhase } from '@/features/playbooks';
import { tasksService, TaskWithDetails } from '@/features/tasks';
import { ProjectInvitation } from '@/types/database';
import { colors, radii, spacing, typography } from '@/theme';

export default function ProjectDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [project, setProject] = useState<ProjectWithRole | null>(null);
  const [members, setMembers] = useState<ProjectMemberWithProfile[]>([]);
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [activeInvitation, setActiveInvitation] = useState<ProjectInvitation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setErrorMessage(null);

    const [projRes, membersRes, invitesRes, phasesRes, tasksRes] = await Promise.all([
      projectsService.fetchProjectDetails(id),
      projectsService.fetchProjectMembers(id),
      projectsService.fetchProjectInvitations(id),
      playbooksService.getProjectPhases(id),
      tasksService.fetchProjectTasks(id),
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

    setIsLoading(false);
  }, [id]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!id) return;
      const [projRes, membersRes, invitesRes, phasesRes, tasksRes] = await Promise.all([
        projectsService.fetchProjectDetails(id),
        projectsService.fetchProjectMembers(id),
        projectsService.fetchProjectInvitations(id),
        playbooksService.getProjectPhases(id),
        tasksService.fetchProjectTasks(id),
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
      {/* Workspace Header Card */}
      <Card style={styles.headerCard}>
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
      </Card>

      {/* Invitation Card */}
      {isOwnerOrAdmin ? (
        <Card style={styles.inviteCard}>
          <View style={styles.inviteHeader}>
            <View>
              <Text style={styles.cardSectionTitle}>Team Invitation</Text>
              <Text style={styles.cardSectionSubtitle}>
                Invite teammates with an expiring join code
              </Text>
            </View>
            <Button
              title={activeInvitation ? 'New Code' : 'Generate'}
              variant="outline"
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
        <View style={styles.phasesHeader}>
          <View>
            <Text style={styles.cardSectionTitle}>Workflow Phases ({phases.length})</Text>
            <Text style={styles.cardSectionSubtitle}>
              {phases.filter((p) => p.is_completed).length} of {phases.length} completed
            </Text>
          </View>
          <Button
            title="Manage"
            variant="text"
            size="sm"
            onPress={() => router.push(`/projects/${project.id}/phases` as Href)}
          />
        </View>

        {phases.length > 0 ? (
          <View style={styles.phasePreviewList}>
            {phases.slice(0, 4).map((phase, i) => (
              <View key={phase.id} style={styles.phasePreviewRow}>
                <View
                  style={[
                    styles.phaseStatusDot,
                    phase.is_completed ? styles.phaseStatusDotDone : null,
                  ]}
                >
                  {phase.is_completed ? (
                    <Ionicons name="checkmark" size={10} color={colors.surface} />
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
        ) : (
          <Text style={styles.noPhasesText}>
            No phases configured. Tap Manage to set up playbook phases.
          </Text>
        )}
      </Card>

      {/* Tasks Overview Section */}
      <Card style={styles.phasesCard}>
        <View style={styles.phasesHeader}>
          <View>
            <Text style={styles.cardSectionTitle}>Tasks & Deliverables ({tasks.length})</Text>
            <Text style={styles.cardSectionSubtitle}>
              {tasks.filter((t) => t.status === 'done').length} of {tasks.length} completed
              {tasks.filter((t) => t.due_date && t.due_date < new Date().toISOString() && t.status !== 'done').length > 0 ? (
                <Text style={styles.overdueNotice}>
                  {' '}• {tasks.filter((t) => t.due_date && t.due_date < new Date().toISOString() && t.status !== 'done').length} overdue
                </Text>
              ) : null}
            </Text>
          </View>
          <Button
            title="View All"
            variant="text"
            size="sm"
            onPress={() => router.push(`/projects/${project.id}/tasks` as Href)}
          />
        </View>

        {tasks.length > 0 ? (
          <View style={styles.phasePreviewList}>
            {tasks.slice(0, 3).map((task) => (
              <TouchableOpacity
                key={task.id}
                style={styles.phasePreviewRow}
                onPress={() => router.push(`/projects/${project.id}/tasks/${task.id}` as Href)}
              >
                <View
                  style={[
                    styles.phaseStatusDot,
                    task.status === 'done' ? styles.phaseStatusDotDone : null,
                  ]}
                >
                  {task.status === 'done' ? (
                    <Ionicons name="checkmark" size={10} color={colors.surface} />
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
                />
              </TouchableOpacity>
            ))}
            {tasks.length > 3 ? (
              <Text style={styles.morePhasesText}>+ {tasks.length - 3} more tasks</Text>
            ) : null}
          </View>
        ) : (
          <Text style={styles.noPhasesText}>
            No tasks created yet. Tap View All to create deliverables.
          </Text>
        )}
      </Card>

      {/* Members Section */}
      <Card style={styles.membersCard}>
        <View style={styles.membersHeader}>
          <Text style={styles.cardSectionTitle}>Team Members ({members.length})</Text>
          <Button
            title="Manage"
            variant="text"
            size="sm"
            onPress={() => router.push(`/projects/${project.id}/members` as Href)}
          />
        </View>

        <View style={styles.memberList}>
          {members.map((m) => {
            const displayName = m.profile?.full_name ?? 'Team Member';
            const initials = displayName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);

            return (
              <View key={m.id} style={styles.memberRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{displayName}</Text>
                  <Text style={styles.memberSub}>
                    {m.profile?.university ?? m.profile?.email ?? 'Student'}
                  </Text>
                </View>
                <Badge
                  label={m.role.toUpperCase()}
                  variant={
                    m.role === 'owner' ? 'primary' : m.role === 'admin' ? 'info' : 'default'
                  }
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
                color={colors.textPrimary}
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
    borderTopColor: colors.border,
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
    ...typography.bodyMedium,
    fontWeight: '600',
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
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    marginBottom: spacing.xs,
  },
  codeText: {
    ...typography.titleLarge,
    letterSpacing: 4,
    color: colors.primary,
    fontWeight: '700',
  },
  inviteExpiryText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  noInviteText: {
    ...typography.caption,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  phasesCard: {
    padding: spacing.base,
    gap: spacing.sm,
  },
  phasesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  phasePreviewList: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  phasePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  phaseStatusDot: {
    width: 20,
    height: 20,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceHover,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
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
    marginTop: 2,
  },
  noPhasesText: {
    ...typography.caption,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  overdueNotice: {
    color: colors.dangerText,
    fontWeight: '700',
  },
  membersCard: {
    padding: spacing.base,
  },
  membersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  memberList: {
    gap: spacing.sm,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  avatarText: {
    ...typography.bodyMedium,
    color: colors.primary,
    fontWeight: '700',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    ...typography.bodyMedium,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  memberSub: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
  bottomActions: {
    marginTop: spacing.xs,
  },
});
