import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Button, Card, ErrorView, Input, LoadingView } from '@/components/ui';
import { playbooksService, ProjectPhase } from '@/features/playbooks';
import {
  ProjectMemberWithProfile,
  projectsService,
  ProjectWithRole,
} from '@/features/projects';
import {
  TASK_PRIORITY_OPTIONS,
  tasksService,
  TaskPriority,
} from '@/features/tasks';
import { colors, radii, spacing, typography } from '@/theme';

export default function CreateTaskScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [project, setProject] = useState<ProjectWithRole | null>(null);
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [members, setMembers] = useState<ProjectMemberWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<TaskPriority>('medium');
  const [dueDateText, setDueDateText] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [dueDateError, setDueDateError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!id) return;
      const [projRes, phasesRes, membersRes] = await Promise.all([
        projectsService.fetchProjectDetails(id),
        playbooksService.getProjectPhases(id),
        projectsService.fetchProjectMembers(id),
      ]);
      if (!isMounted) return;

      if (projRes.error) {
        setErrorMessage(projRes.error.message);
      } else {
        setProject(projRes.data);
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
  }, [id]);

  const handleSubmit = async () => {
    if (!id) return;

    let hasError = false;
    if (!title.trim()) {
      setTitleError('Task title is required');
      hasError = true;
    } else {
      setTitleError(null);
    }

    let parsedDueDate: string | null = null;
    if (dueDateText.trim()) {
      const match = dueDateText.trim().match(/^\d{4}-\d{2}-\d{2}$/);
      if (!match) {
        setDueDateError('Enter a valid date in YYYY-MM-DD format');
        hasError = true;
      } else {
        const d = new Date(dueDateText.trim());
        if (isNaN(d.getTime())) {
          setDueDateError('Invalid date value');
          hasError = true;
        } else {
          setDueDateError(null);
          parsedDueDate = d.toISOString();
        }
      }
    } else {
      setDueDateError(null);
    }

    if (hasError) return;

    setIsSubmitting(true);
    const { data: created, error } = await tasksService.createTask(id, {
      title: title.trim(),
      description: description.trim() || undefined,
      phase_id: selectedPhaseId,
      primary_assignee_id: selectedAssigneeId,
      priority: selectedPriority,
      due_date: parsedDueDate,
    });
    setIsSubmitting(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else if (created) {
      router.back();
    }
  };

  if (isLoading) {
    return <LoadingView message="Loading task form..." />;
  }

  if (errorMessage || !project) {
    return (
      <View style={styles.container}>
        <ErrorView
          title="Cannot load form"
          message={errorMessage ?? 'Project not found.'}
          onRetry={() => router.back()}
          style={styles.errorContainer}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.headerBlock}>
          <Text style={styles.headerSubtitle}>{project.name}</Text>
          <Text style={styles.headerTitle} accessibilityRole="header">
            Create New Task
          </Text>
        </View>

        <Card style={styles.formCard}>
          {/* Title */}
          <Input
            label="Task Title *"
            placeholder="e.g. Implement Supabase Auth RLS"
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              if (text.trim()) setTitleError(null);
            }}
            error={titleError ?? undefined}
            autoFocus
          />

          {/* Description */}
          <Input
            label="Description (Optional)"
            placeholder="Key deliverables, requirements, acceptance criteria..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />

          {/* Priority Selection */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionLabel}>Priority</Text>
            <View style={styles.chipRow}>
              {TASK_PRIORITY_OPTIONS.map((opt) => {
                const isSelected = selectedPriority === opt.priority;
                return (
                  <Pressable
                    key={opt.priority}
                    hitSlop={6}
                    style={[styles.chip, isSelected ? styles.chipSelected : null]}
                    onPress={() => setSelectedPriority(opt.priority)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`Set priority to ${opt.label}`}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected ? styles.chipTextSelected : null,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Workflow Phase Selection */}
          {phases.length > 0 ? (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionLabel}>Workflow Phase (Optional)</Text>
              <View style={styles.chipRow}>
                <Pressable
                  hitSlop={6}
                  style={[styles.chip, selectedPhaseId === null ? styles.chipSelected : null]}
                  onPress={() => setSelectedPhaseId(null)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedPhaseId === null ? styles.chipTextSelected : null,
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
                      hitSlop={6}
                      style={[styles.chip, isSelected ? styles.chipSelected : null]}
                      onPress={() => setSelectedPhaseId(ph.id)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          isSelected ? styles.chipTextSelected : null,
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

          {/* Primary Assignee Selection */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionLabel}>Assignee (Optional)</Text>
            <View style={styles.chipRow}>
              <Pressable
                hitSlop={6}
                style={[styles.chip, selectedAssigneeId === null ? styles.chipSelected : null]}
                onPress={() => setSelectedAssigneeId(null)}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedAssigneeId === null ? styles.chipTextSelected : null,
                  ]}
                >
                  Unassigned
                </Text>
              </Pressable>
              {members.map((m) => {
                const isSelected = selectedAssigneeId === m.user_id;
                const name = m.profile?.full_name ?? 'Member';
                return (
                  <Pressable
                    key={m.id}
                    hitSlop={6}
                    style={[styles.chip, isSelected ? styles.chipSelected : null]}
                    onPress={() => setSelectedAssigneeId(m.user_id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected ? styles.chipTextSelected : null,
                      ]}
                    >
                      {name} ({m.role})
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Due Date */}
          <Input
            label="Due Date (Optional)"
            placeholder="YYYY-MM-DD (e.g. 2026-11-15)"
            value={dueDateText}
            onChangeText={(text) => {
              setDueDateText(text);
              if (dueDateError) setDueDateError(null);
            }}
            error={dueDateError ?? undefined}
            helperText="Tasks past due will be highlighted for review."
            leftIcon={<Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />}
          />

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <Button
              title="Cancel"
              variant="secondary"
              size="md"
              onPress={() => router.back()}
              style={styles.actionBtn}
            />
            <Button
              title="Create Task"
              variant="primary"
              size="md"
              loading={isSubmitting}
              onPress={handleSubmit}
              style={styles.actionBtn}
              leftIcon={<Ionicons name="checkmark" size={18} color={colors.surface} />}
            />
          </View>
        </Card>
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
  headerBlock: {
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    ...typography.overline,
    color: colors.primary,
    marginBottom: 2,
  },
  headerTitle: {
    ...typography.titleLarge,
    color: colors.textPrimary,
  },
  formCard: {
    padding: spacing.base,
  },
  sectionContainer: {
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  sectionLabel: {
    ...typography.label,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textPrimary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  chipText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  actionBtn: {
    flex: 1,
  },
});
