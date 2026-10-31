import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Badge, Button, Card, ErrorView, Input, LoadingView } from '@/components/ui';
import { useAuth } from '@/features/auth';
import { projectsService, ProjectWithRole } from '@/features/projects';
import {
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
  TaskChecklistItem,
  TaskCommentWithProfile,
  tasksService,
  TaskStatus,
  TaskWithDetails,
} from '@/features/tasks';
import { colors, radii, spacing, typography } from '@/theme';

export default function TaskDetailsScreen() {
  const router = useRouter();
  const { id: projectId, taskId } = useLocalSearchParams<{ id: string; taskId: string }>();
  const { user } = useAuth();

  const [project, setProject] = useState<ProjectWithRole | null>(null);
  const [task, setTask] = useState<TaskWithDetails | null>(null);
  const [checklist, setChecklist] = useState<TaskChecklistItem[]>([]);
  const [comments, setComments] = useState<TaskCommentWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New Checklist Item Input
  const [newChecklistText, setNewChecklistText] = useState('');
  const [isAddingChecklist, setIsAddingChecklist] = useState(false);

  // New Comment Input
  const [newCommentText, setNewCommentText] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);

  const fetchData = useCallback(async () => {
    if (!projectId || !taskId) return;
    setErrorMessage(null);

    const [projRes, taskRes, checkRes, commRes] = await Promise.all([
      projectsService.fetchProjectDetails(projectId),
      tasksService.fetchTaskDetails(taskId),
      tasksService.fetchTaskChecklist(taskId),
      tasksService.fetchTaskComments(taskId),
    ]);

    if (projRes.error) {
      setErrorMessage(projRes.error.message);
    } else {
      setProject(projRes.data);
    }

    if (taskRes.error) {
      setErrorMessage(taskRes.error.message);
    } else {
      setTask(taskRes.data);
    }

    if (checkRes.data) {
      setChecklist(checkRes.data);
    }

    if (commRes.data) {
      setComments(commRes.data);
    }

    setIsLoading(false);
  }, [projectId, taskId]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!projectId || !taskId) return;
      const [projRes, taskRes, checkRes, commRes] = await Promise.all([
        projectsService.fetchProjectDetails(projectId),
        tasksService.fetchTaskDetails(taskId),
        tasksService.fetchTaskChecklist(taskId),
        tasksService.fetchTaskComments(taskId),
      ]);
      if (!isMounted) return;

      if (projRes.error) {
        setErrorMessage(projRes.error.message);
      } else {
        setProject(projRes.data);
      }
      if (taskRes.error) {
        setErrorMessage(taskRes.error.message);
      } else {
        setTask(taskRes.data);
      }
      if (checkRes.data) {
        setChecklist(checkRes.data);
      }
      if (commRes.data) {
        setComments(commRes.data);
      }
      setIsLoading(false);
    })();

    return () => {
      isMounted = false;
    };
  }, [projectId, taskId]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  };

  // Status Change / Reopening
  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!task) return;
    setTask((prev) => (prev ? { ...prev, status: newStatus } : null));

    const { error } = await tasksService.updateTask(task.id, { status: newStatus });
    if (error) {
      Alert.alert('Error', error.message);
      fetchData();
    }
  };

  // Checklist Item Toggle
  const handleToggleChecklist = async (item: TaskChecklistItem) => {
    const nextStatus = !item.is_completed;
    setChecklist((prev) =>
      prev.map((c) => (c.id === item.id ? { ...c, is_completed: nextStatus } : c))
    );

    const { error } = await tasksService.toggleChecklistItem(item.id, nextStatus);
    if (error) {
      Alert.alert('Error', error.message);
      fetchData();
    }
  };

  // Add Checklist Item
  const handleAddChecklist = async () => {
    if (!taskId || !newChecklistText.trim()) return;
    setIsAddingChecklist(true);
    const { data: created, error } = await tasksService.addChecklistItem(
      taskId,
      newChecklistText.trim()
    );
    setIsAddingChecklist(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else if (created) {
      setChecklist((prev) => [...prev, created]);
      setNewChecklistText('');
    }
  };

  // Delete Checklist Item
  const handleDeleteChecklist = async (itemId: string) => {
    setChecklist((prev) => prev.filter((c) => c.id !== itemId));
    await tasksService.deleteChecklistItem(itemId);
  };

  // Add Comment
  const handlePostComment = async () => {
    if (!taskId || !newCommentText.trim()) return;
    setIsPostingComment(true);
    const { data: created, error } = await tasksService.addComment(taskId, newCommentText.trim());
    setIsPostingComment(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else if (created) {
      setComments((prev) => [...prev, created]);
      setNewCommentText('');
    }
  };

  // Delete Comment
  const handleDeleteComment = async (commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    await tasksService.deleteComment(commentId);
  };

  // Archive Task Toggle
  const handleToggleArchive = async () => {
    if (!task) return;
    const willArchive = !task.is_archived;
    Alert.alert(
      willArchive ? 'Archive Task' : 'Restore Task',
      willArchive
        ? 'Archived tasks are hidden from the active task board.'
        : 'Restore this task to active work?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: willArchive ? 'Archive' : 'Restore',
          style: willArchive ? 'destructive' : 'default',
          onPress: async () => {
            const { error } = await tasksService.archiveTask(task.id, willArchive);
            if (error) {
              Alert.alert('Error', error.message);
            } else {
              router.back();
            }
          },
        },
      ]
    );
  };

  // Delete Task
  const handleDeleteTask = () => {
    if (!task) return;
    Alert.alert(
      'Delete Task',
      `Permanently delete "${task.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await tasksService.deleteTask(task.id);
            if (error) {
              Alert.alert('Error', error.message);
            } else {
              router.back();
            }
          },
        },
      ]
    );
  };

  if (isLoading && !isRefreshing) {
    return <LoadingView message="Loading task details..." />;
  }

  if (errorMessage || !task || !project) {
    return (
      <View style={styles.container}>
        <ErrorView
          title="Cannot load task"
          message={errorMessage ?? 'Task not found or access denied.'}
          onRetry={() => fetchData()}
          style={styles.errorContainer}
        />
      </View>
    );
  }

  const isOwnerOrAdmin =
    project.currentUserRole === 'owner' || project.currentUserRole === 'admin';
  const canDeleteTask = isOwnerOrAdmin || task.created_by === user?.id;
  const isDone = task.status === 'done';
  const nowIso = new Date().toISOString();
  const isOverdue = Boolean(task.due_date && task.due_date < nowIso && !isDone);

  const statusOpt = TASK_STATUS_OPTIONS.find((s) => s.status === task.status);
  const priorityOpt = TASK_PRIORITY_OPTIONS.find((p) => p.priority === task.priority);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
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
        {/* Main Task Header Card */}
        <Card style={styles.mainCard}>
          <View style={styles.headerBadgeRow}>
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

          <Text style={styles.taskTitle} accessibilityRole="header">
            {task.title}
          </Text>

          {task.description ? (
            <Text style={styles.taskDesc}>{task.description}</Text>
          ) : (
            <Text style={styles.noDescText}>No description provided.</Text>
          )}

          {/* Quick Status Bar & Reopen Button */}
          <View style={styles.statusBarContainer}>
            <Text style={styles.statusLabel}>Change Status:</Text>
            <View style={styles.statusBtnRow}>
              {(['todo', 'in_progress', 'in_review', 'done'] as TaskStatus[]).map((st) => {
                const isSelected = task.status === st;
                const opt = TASK_STATUS_OPTIONS.find((o) => o.status === st);
                return (
                  <TouchableOpacity
                    key={st}
                    style={[styles.statusOptionChip, isSelected ? styles.statusOptionChipActive : null]}
                    onPress={() => handleStatusChange(st)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`Set status to ${opt?.label}`}
                  >
                    <Text
                      style={[
                        styles.statusOptionChipText,
                        isSelected ? styles.statusOptionChipTextActive : null,
                      ]}
                    >
                      {opt?.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Metadata Grid: Assignee & Due Date */}
          <View style={styles.metaGrid}>
            <View style={styles.metaCell}>
              <Text style={styles.metaCellLabel}>Primary Assignee</Text>
              <Text style={styles.metaCellValue}>
                {task.primary_assignee?.full_name ?? 'Unassigned'}
              </Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaCellLabel}>Due Date</Text>
              <Text
                style={[
                  styles.metaCellValue,
                  isOverdue ? styles.overdueValue : null,
                ]}
              >
                {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No deadline'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Checklist Section */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Checklist ({checklist.filter((c) => c.is_completed).length}/{checklist.length})
            </Text>
          </View>

          {checklist.map((item) => (
            <View key={item.id} style={styles.checklistItemRow}>
              <TouchableOpacity
                style={[styles.checkbox, item.is_completed ? styles.checkboxChecked : null]}
                onPress={() => handleToggleChecklist(item)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: item.is_completed }}
                accessibilityLabel={`Checklist item: ${item.title}`}
              >
                {item.is_completed ? (
                  <Ionicons name="checkmark" size={14} color={colors.surface} />
                ) : null}
              </TouchableOpacity>
              <Text
                style={[
                  styles.checklistItemTitle,
                  item.is_completed ? styles.checklistItemTitleDone : null,
                ]}
              >
                {item.title}
              </Text>
              <TouchableOpacity
                onPress={() => handleDeleteChecklist(item.id)}
                style={styles.deleteChecklistBtn}
                accessibilityLabel={`Delete item ${item.title}`}
              >
                <Ionicons name="close" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))}

          {/* Add Checklist Item Row */}
          <View style={styles.addChecklistRow}>
            <Input
              label=""
              placeholder="Add checklist item..."
              value={newChecklistText}
              onChangeText={setNewChecklistText}
              style={styles.addChecklistInput}
            />
            <Button
              title="Add"
              variant="outline"
              size="sm"
              loading={isAddingChecklist}
              onPress={handleAddChecklist}
            />
          </View>
        </Card>

        {/* Comments Section */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Comments ({comments.length})</Text>
          </View>

          {comments.map((comment) => {
            const authorName = comment.author?.full_name ?? 'Team Member';
            const initials = authorName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);
            const canDeleteComment = comment.user_id === user?.id || isOwnerOrAdmin;

            return (
              <View key={comment.id} style={styles.commentRow}>
                <View style={styles.commentAvatar}>
                  <Text style={styles.commentAvatarText}>{initials}</Text>
                </View>
                <View style={styles.commentBody}>
                  <View style={styles.commentMetaRow}>
                    <Text style={styles.commentAuthor}>{authorName}</Text>
                    <Text style={styles.commentTime}>
                      {new Date(comment.created_at).toLocaleDateString()}
                    </Text>
                    {canDeleteComment ? (
                      <TouchableOpacity
                        onPress={() => handleDeleteComment(comment.id)}
                        accessibilityLabel="Delete comment"
                      >
                        <Ionicons name="trash-outline" size={14} color={colors.danger} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  <Text style={styles.commentContent}>{comment.content}</Text>
                </View>
              </View>
            );
          })}

          {/* Add Comment Row */}
          <View style={styles.addCommentContainer}>
            <Input
              label="Leave a comment"
              placeholder="Share updates, blockers, or feedback..."
              value={newCommentText}
              onChangeText={setNewCommentText}
              multiline
              numberOfLines={3}
            />
            <Button
              title="Post Comment"
              variant="primary"
              size="sm"
              loading={isPostingComment}
              onPress={handlePostComment}
              style={styles.postCommentBtn}
            />
          </View>
        </Card>

        {/* Footer Actions: Archive & Delete */}
        <View style={styles.footerActions}>
          <Button
            title={task.is_archived ? 'Restore Task' : 'Archive Task'}
            variant="outline"
            size="md"
            leftIcon={
              <Ionicons
                name={task.is_archived ? 'refresh-outline' : 'archive-outline'}
                size={16}
                color={colors.textPrimary}
              />
            }
            onPress={handleToggleArchive}
          />
          {canDeleteTask ? (
            <Button
              title="Delete Task"
              variant="destructive"
              size="md"
              leftIcon={<Ionicons name="trash-outline" size={16} color={colors.surface} />}
              onPress={handleDeleteTask}
            />
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  mainCard: {
    padding: spacing.base,
    gap: spacing.sm,
  },
  headerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  taskTitle: {
    ...typography.titleLarge,
    color: colors.textPrimary,
  },
  taskDesc: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  noDescText: {
    ...typography.bodyMedium,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  statusBarContainer: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  statusLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  statusBtnRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  statusOptionChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceHover,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusOptionChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusOptionChipText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  statusOptionChipTextActive: {
    color: colors.surface,
  },
  metaGrid: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
    gap: spacing.base,
  },
  metaCell: {
    flex: 1,
  },
  metaCellLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  metaCellValue: {
    ...typography.bodyMedium,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  overdueValue: {
    color: colors.dangerText,
  },
  sectionCard: {
    padding: spacing.base,
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    ...typography.titleMedium,
    color: colors.textPrimary,
  },
  checklistItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderMuted,
  },
  checkbox: {
    width: 20,
    height: 20,
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
  checklistItemTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    flex: 1,
  },
  checklistItemTitleDone: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  deleteChecklistBtn: {
    padding: 4,
  },
  addChecklistRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  addChecklistInput: {
    flex: 1,
  },
  commentRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderMuted,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primary,
  },
  commentBody: {
    flex: 1,
    gap: 2,
  },
  commentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  commentAuthor: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  commentTime: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textMuted,
    marginRight: 'auto',
    marginLeft: spacing.sm,
  },
  commentContent: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  addCommentContainer: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  postCommentBtn: {
    alignSelf: 'flex-end',
  },
  footerActions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
