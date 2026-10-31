import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Button, Card, ErrorView, Input } from '@/components/ui';
import {
  projectsService,
  PROJECT_TYPE_OPTIONS,
  ProjectType,
} from '@/features/projects';
import { colors, radii, spacing, typography } from '@/theme';

export default function CreateProjectScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [projectType, setProjectType] = useState<ProjectType>('course_assignment');
  const [courseCode, setCourseCode] = useState('');
  const [semester, setSemester] = useState('');
  const [targetDate, setTargetDate] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setErrorMessage(null);
    const trimmedName = name.trim();

    if (!trimmedName) {
      setErrorMessage('Please enter a project name.');
      return;
    }

    setIsSubmitting(true);

    const { data: projectId, error } = await projectsService.createProject({
      name: trimmedName,
      description: description.trim() || undefined,
      project_type: projectType,
      course_code: courseCode.trim() || undefined,
      semester: semester.trim() || undefined,
      target_date: targetDate.trim() ? new Date(targetDate.trim()).toISOString() : undefined,
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
    } else if (projectId) {
      router.replace('/(tabs)/projects');
    } else {
      router.back();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        accessibilityRole="scrollview"
      >
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            Create Workspace
          </Text>
          <Text style={styles.subtitle}>
            Set up an isolated project for your team, coursework, or research.
          </Text>
        </View>

        {errorMessage ? (
          <ErrorView
            message={errorMessage}
            inline
            style={styles.error}
          />
        ) : null}

        <Card style={styles.card}>
          <Input
            label="Project Name *"
            value={name}
            onChangeText={setName}
            placeholder="e.g. MelBond Mobile Platform"
            accessibilityLabel="Project Name"
            autoFocus
          />

          <Text style={styles.fieldLabel}>Workspace Type *</Text>
          <View style={styles.typeGrid} accessibilityRole="radiogroup">
            {PROJECT_TYPE_OPTIONS.map((opt) => {
              const isSelected = projectType === opt.type;
              return (
                <Pressable
                  key={opt.type}
                  style={[styles.typeOption, isSelected && styles.typeOptionSelected]}
                  onPress={() => setProjectType(opt.type)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={opt.label}
                >
                  <Ionicons
                    name={opt.icon as unknown as keyof typeof Ionicons.glyphMap}
                    size={22}
                    color={isSelected ? colors.primary : colors.textMuted}
                  />
                  <View style={styles.typeOptionTextCol}>
                    <Text
                      style={[
                        styles.typeOptionTitle,
                        isSelected && styles.typeOptionTitleSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    <Text style={styles.typeOptionDesc}>{opt.description}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Input
            label="Description (optional)"
            value={description}
            onChangeText={setDescription}
            placeholder="Brief overview of goals and scope"
            multiline
            numberOfLines={3}
            accessibilityLabel="Project Description"
          />

          <View style={styles.row}>
            <View style={styles.col}>
              <Input
                label="Course Code (optional)"
                value={courseCode}
                onChangeText={setCourseCode}
                placeholder="e.g. CS490"
                autoCapitalize="characters"
                accessibilityLabel="Course Code"
              />
            </View>
            <View style={styles.col}>
              <Input
                label="Semester (optional)"
                value={semester}
                onChangeText={setSemester}
                placeholder="e.g. Fall 2026"
                accessibilityLabel="Semester"
              />
            </View>
          </View>

          <Input
            label="Target Deadline (optional)"
            value={targetDate}
            onChangeText={setTargetDate}
            placeholder="YYYY-MM-DD"
            helperText="Planned completion date"
            accessibilityLabel="Target Deadline"
          />

          <Button
            title="Create Project"
            variant="primary"
            size="lg"
            loading={isSubmitting}
            onPress={handleSubmit}
            style={styles.submitBtn}
            accessibilityLabel="Submit Create Project"
          />
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
  },
  header: {
    marginBottom: spacing.base,
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
  error: {
    marginBottom: spacing.base,
  },
  card: {
    padding: spacing.base,
  },
  fieldLabel: {
    ...typography.bodyMedium,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  typeGrid: {
    gap: spacing.xs,
    marginBottom: spacing.base,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
  },
  typeOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  typeOptionTextCol: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  typeOptionTitle: {
    ...typography.bodyMedium,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  typeOptionTitleSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  typeOptionDesc: {
    ...typography.caption,
    fontSize: 11,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  col: {
    flex: 1,
  },
  submitBtn: {
    marginTop: spacing.md,
  },
});
