import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Avatar, Badge, Button, Card, ErrorView, LoadingView } from '@/components/ui';
import { useAuth } from '@/features/auth';
import {
  projectsService,
  ProjectWithRole,
  ProjectMemberWithProfile,
  ProjectRole,
} from '@/features/projects';
import { colors, spacing, typography } from '@/theme';

export default function ProjectMembersScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [project, setProject] = useState<ProjectWithRole | null>(null);
  const [members, setMembers] = useState<ProjectMemberWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setErrorMessage(null);

    const [projRes, membersRes] = await Promise.all([
      projectsService.fetchProjectDetails(id),
      projectsService.fetchProjectMembers(id),
    ]);

    if (projRes.error) {
      setErrorMessage(projRes.error.message);
    } else {
      setProject(projRes.data);
    }

    if (membersRes.data) {
      setMembers(membersRes.data);
    }

    setIsLoading(false);
  }, [id]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!id) return;
      const [projRes, membersRes] = await Promise.all([
        projectsService.fetchProjectDetails(id),
        projectsService.fetchProjectMembers(id),
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

  const handleRoleChange = (member: ProjectMemberWithProfile) => {
    if (!project || !id) return;
    const isOwner = project.currentUserRole === 'owner';
    if (!isOwner) {
      Alert.alert('Permission Denied', 'Only workspace owners can modify member roles.');
      return;
    }

    if (member.role === 'owner') {
      Alert.alert('Ownership', 'This member is an owner.');
      return;
    }

    const nextRole: ProjectRole = member.role === 'member' ? 'admin' : 'member';

    Alert.alert(
      'Change Role',
      `Promote or demote ${member.profile?.full_name ?? 'this user'} to ${nextRole.toUpperCase()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Set to ${nextRole.toUpperCase()}`,
          onPress: async () => {
            const { error } = await projectsService.updateMemberRole(id, member.user_id, nextRole);
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

  const handleRemoveMember = (member: ProjectMemberWithProfile) => {
    if (!id) return;
    Alert.alert(
      'Remove Teammate',
      `Are you sure you want to remove ${member.profile?.full_name ?? 'this member'} from the workspace?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const { error } = await projectsService.removeMember(id, member.user_id);
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

  const handleLeaveProject = () => {
    if (!id || !project) return;
    Alert.alert(
      'Leave Workspace',
      'Are you sure you want to leave this project? You will need a new invitation code to rejoin.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            const { error } = await projectsService.leaveProject(id);
            if (error) {
              Alert.alert('Cannot Leave', error.message);
            } else {
              router.replace('/(tabs)/projects');
            }
          },
        },
      ]
    );
  };

  if (isLoading && !isRefreshing) {
    return <LoadingView message="Loading members..." />;
  }

  if (errorMessage || !project) {
    return (
      <View style={styles.container}>
        <ErrorView
          title="Cannot load members"
          message={errorMessage ?? 'Error loading workspace.'}
          onRetry={() => fetchData()}
          style={styles.errorContainer}
        />
      </View>
    );
  }

  const isOwnerOrAdmin =
    project.currentUserRole === 'owner' || project.currentUserRole === 'admin';

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
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{project.name}</Text>
        <Text style={styles.title} accessibilityRole="header">
          Workspace Team
        </Text>
        <Text style={styles.subtitle}>
          {members.length} {members.length === 1 ? 'member' : 'members'} in this workspace
        </Text>
      </View>

      <Card style={styles.card}>
        <View style={styles.list}>
          {members.map((m, i) => {
            const displayName = m.profile?.full_name ?? 'Team Member';
            const isCurrentUser = m.user_id === user?.id;

            return (
              <View
                key={m.id}
                style={[styles.memberRow, i > 0 && styles.memberRowBorder]}
              >
                <Avatar
                  name={displayName}
                  avatarUrl={m.profile?.avatar_url}
                  size={44}
                  style={styles.avatarSpacing}
                />

                <View style={styles.memberInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.memberName} numberOfLines={1}>
                      {displayName}
                    </Text>
                    {isCurrentUser ? <Text style={styles.youBadge}>(You)</Text> : null}
                  </View>
                  <Text style={styles.memberSub} numberOfLines={1}>
                    {m.profile?.university ?? m.profile?.email ?? 'Student'}
                  </Text>
                  <Text style={styles.memberDate}>
                    Joined {new Date(m.joined_at).toLocaleDateString()}
                  </Text>
                </View>

                <View style={styles.rightCol}>
                  <Badge
                    label={m.role.toUpperCase()}
                    variant={
                      m.role === 'owner' ? 'primary' : m.role === 'admin' ? 'info' : 'default'
                    }
                    size="sm"
                  />

                  {isOwnerOrAdmin && !isCurrentUser && m.role !== 'owner' ? (
                    <View style={styles.actionRow}>
                      {project.currentUserRole === 'owner' ? (
                        <Button
                          title={m.role === 'member' ? 'Promote' : 'Demote'}
                          variant="text"
                          size="sm"
                          onPress={() => handleRoleChange(m)}
                        />
                      ) : null}
                      <Button
                        title="Remove"
                        variant="text"
                        size="sm"
                        onPress={() => handleRemoveMember(m)}
                      />
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      </Card>

      <View style={styles.leaveSection}>
        <Button
          title="Leave Workspace"
          variant="destructive"
          size="md"
          leftIcon={<Ionicons name="exit-outline" size={18} color={colors.surface} />}
          onPress={handleLeaveProject}
          accessibilityLabel="Leave Workspace"
        />
      </View>
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
  header: {
    marginBottom: spacing.xs,
  },
  eyebrow: {
    ...typography.overline,
    color: colors.primary,
    marginBottom: spacing.xxs,
  },
  title: {
    ...typography.titleLarge,
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  card: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
  },
  list: {
    flexDirection: 'column',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  memberRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  avatarSpacing: {
    marginRight: spacing.md,
  },
  memberInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  memberName: {
    ...typography.label,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  youBadge: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  memberSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  memberDate: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  rightCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 2,
  },
  leaveSection: {
    marginTop: spacing.md,
  },
});
