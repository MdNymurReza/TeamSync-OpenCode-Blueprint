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

import { Button, Card, ErrorView, IconTile, Input } from '@/components/ui';
import {
  projectsService,
  PROJECT_TYPE_OPTIONS,
  ProjectType,
} from '@/features/projects';
import { colors, radii, spacing, touchTargets, typography } from '@/theme';

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
          <Text style={styles.eyebrow}>New Workspace</Text>
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
          <Text style={styles.sectionOverline}>Workspace Identity</Text>

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
              const iconName = opt.icon as unknown as keyof typeof Ionicons.glyphMap;
              return (
                <Pressable
                  key={opt.type}
                  style={({ pressed }) => [
                    styles.typeOption,
                    isSelected && styles.typeOptionSelected,
                    pressed && styles.typeOptionPressed,
                  ]}
                  onPress={() => setProjectType(opt.type)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={opt.label}
                >
                  <IconTile
                    name={iconName}
                    tone={isSelected ? 'primary' : 'neutral'}
                    size={40}
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
                  <Ionicons
                    name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={isSelected ? colors.primary : colors.borderMuted}
                  />
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionOverline}>Academic Context</Text>

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
  error: {
    marginBottom: spacing.base,
  },
  card: {
    padding: spacing.base,
  },
  sectionOverline: {
    ...typography.overline,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    ...typography.label,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  typeGrid: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: touchTargets.minTouchSize,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
  },
  typeOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  typeOptionPressed: {
    backgroundColor: colors.surfaceHover,
  },
  typeOptionTextCol: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  typeOptionTitle: {
    ...typography.label,
    color: colors.textPrimary,
  },
  typeOptionTitleSelected: {
    color: colors.primary,
  },
  typeOptionDesc: {
    ...typography.caption,
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
    marginTop: spacing.sm,
  },
});
