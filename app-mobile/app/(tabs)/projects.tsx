import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { type Href, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorView,
  IconTile,
  LoadingView,
  ScreenHeader,
  TabScreen,
} from '@/components/ui';
import { projectsService, ProjectWithRole, PROJECT_TYPE_OPTIONS } from '@/features/projects';
import { colors, radii, shadows, spacing, touchTargets, typography } from '@/theme';

export default function ProjectsScreen() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<'active' | 'archived'>('active');

  const fetchProjects = useCallback(async () => {
    setErrorMessage(null);
    const { data, error } = await projectsService.fetchUserProjects();
    if (error) {
      setErrorMessage(error.message);
    } else {
      setProjects(data ?? []);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const { data, error } = await projectsService.fetchUserProjects();
      if (!isMounted) return;
      if (error) {
        setErrorMessage(error.message);
      } else {
        setProjects(data ?? []);
      }
      setIsLoading(false);
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchProjects();
    setIsRefreshing(false);
  };

  const filteredProjects = projects.filter((p) =>
    filter === 'active' ? !p.is_archived : p.is_archived
  );

  const getRoleVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'primary' as const;
      case 'admin':
        return 'info' as const;
      default:
        return 'default' as const;
    }
  };

  const getTypeOption = (type: string) => {
    return PROJECT_TYPE_OPTIONS.find((o) => o.type === type);
  };

  if (isLoading && !isRefreshing) {
    return <LoadingView message="Loading workspaces..." />;
  }

  return (
    <TabScreen refreshing={isRefreshing} onRefresh={handleRefresh}>
      <ScreenHeader
        eyebrow="Team Workspaces"
        title="Workspaces"
        subtitle="Student projects, course assignments & research teams."
      />

      <View style={styles.actionRow}>
        <Button
          title="New Project"
          variant="primary"
          size="md"
          leftIcon={<Ionicons name="add" size={18} color={colors.surface} />}
          onPress={() => router.push('/projects/new')}
          style={styles.actionButton}
          accessibilityLabel="Create a new project"
        />
        <Button
          title="Join with Code"
          variant="secondary"
          size="md"
          leftIcon={<Ionicons name="key-outline" size={18} color={colors.primary} />}
          onPress={() => router.push('/projects/join')}
          style={styles.actionButton}
          accessibilityLabel="Join project using invitation code"
        />
      </View>

      {/* Segmented Control Filter */}
      <View style={styles.filterRow} accessibilityRole="tablist">
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: filter === 'active' }}
          accessibilityLabel="Active projects"
          style={[styles.filterTab, filter === 'active' && styles.filterTabActive]}
          onPress={() => setFilter('active')}
        >
          <Text
            style={[styles.filterTabText, filter === 'active' && styles.filterTabTextActive]}
          >
            Active ({projects.filter((p) => !p.is_archived).length})
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: filter === 'archived' }}
          accessibilityLabel="Archived projects"
          style={[styles.filterTab, filter === 'archived' && styles.filterTabActive]}
          onPress={() => setFilter('archived')}
        >
          <Text
            style={[styles.filterTabText, filter === 'archived' && styles.filterTabTextActive]}
          >
            Archived ({projects.filter((p) => p.is_archived).length})
          </Text>
        </Pressable>
      </View>

      {errorMessage ? (
        <ErrorView
          title="Could not load projects"
          message={errorMessage}
          onRetry={() => fetchProjects()}
          style={styles.error}
        />
      ) : filteredProjects.length === 0 ? (
        <Card style={styles.emptyCard}>
          <EmptyState
            title={filter === 'active' ? 'No active workspaces' : 'No archived projects'}
            description={
              filter === 'active'
                ? 'Create a project for your team or join an existing workspace using an invitation code.'
                : 'Projects you complete or archive will appear here.'
            }
            icon={
              <Ionicons
                name={filter === 'active' ? 'folder-open-outline' : 'archive-outline'}
                size={38}
                color={colors.primary}
              />
            }
            actionTitle={filter === 'active' ? 'Create Project' : undefined}
            onAction={filter === 'active' ? () => router.push('/projects/new') : undefined}
          />
        </Card>
      ) : (
        <View style={styles.listContainer}>
          {filteredProjects.map((project) => {
            const typeOpt = getTypeOption(project.project_type);
            const iconName = (typeOpt?.icon ?? 'folder-outline') as keyof typeof Ionicons.glyphMap;
            return (
              <Card
                key={project.id}
                style={styles.projectCard}
                onPress={() => router.push(`/projects/${project.id}` as Href)}
                accessibilityLabel={`Project ${project.name}`}
              >
                <View style={styles.projectCardHeader}>
                  <IconTile name={iconName} tone="primary" size={44} />
                  <View style={styles.projectCardTitleCol}>
                    <Text style={styles.projectName} numberOfLines={1}>
                      {project.name}
                    </Text>
                    {project.description ? (
                      <Text style={styles.projectDesc} numberOfLines={2}>
                        {project.description}
                      </Text>
                    ) : null}
                  </View>
                  <Badge
                    label={project.currentUserRole.toUpperCase()}
                    variant={getRoleVariant(project.currentUserRole)}
                    size="sm"
                  />
                </View>

                <View style={styles.projectCardFooter}>
                  <Badge label={typeOpt?.label ?? project.project_type} variant="default" size="sm" />
                  {project.course_code ? (
                    <Badge label={project.course_code} variant="default" size="sm" />
                  ) : null}
                  {project.semester ? (
                    <Text style={styles.semesterText}>{project.semester}</Text>
                  ) : null}
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  actionButton: {
    flex: 1,
  },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.lg,
    padding: 4,
    marginBottom: spacing.base,
  },
  filterTab: {
    flex: 1,
    minHeight: touchTargets.minTouchSize - 8,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  filterTabActive: {
    backgroundColor: colors.surface,
    ...shadows.subtle,
  },
  filterTabText: {
    ...typography.bodyMedium,
    color: colors.textMuted,
  },
  filterTabTextActive: {
    ...typography.label,
    color: colors.textPrimary,
  },
  error: {
    marginTop: spacing.md,
  },
  emptyCard: {
    paddingVertical: spacing.xs,
  },
  listContainer: {
    gap: spacing.md,
  },
  projectCard: {
    padding: spacing.base,
  },
  projectCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  projectCardTitleCol: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  projectName: {
    ...typography.titleSmall,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  projectDesc: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  projectCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  semesterText: {
    ...typography.caption,
    color: colors.textMuted,
    marginLeft: 'auto',
  },
});
