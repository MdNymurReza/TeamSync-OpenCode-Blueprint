import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Badge, Card, EmptyState } from '@/components/ui';
import { colors, spacing, typography } from '@/theme';

export default function HomeScreen() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      accessibilityRole="scrollview"
    >
      {/* Overview Header */}
      <View style={styles.header}>
        <Text style={styles.greeting} accessibilityRole="header">
          Welcome to MelBond
        </Text>
        <Text style={styles.subGreeting}>
          One project, one organized student workspace.
        </Text>
      </View>

      {/* System Status Card */}
      <Card style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Text style={styles.statusTitle}>Design Foundation & App Shell</Text>
          <Badge
            variant="success"
            label="Phase 1 Active"
            icon={<Ionicons name="checkmark-circle" size={14} color={colors.successText} />}
          />
        </View>
        <Text style={styles.statusDescription}>
          Navigation tabs, design tokens, and accessible component primitives are loaded.
          Authentication and database connectivity connect in Phase 2.
        </Text>
      </Card>

      {/* Section: Urgent Work */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Upcoming Tasks</Text>
        <Badge
          variant="default"
          label="0 Due"
          icon={<Ionicons name="time-outline" size={14} color={colors.textSecondary} />}
        />
      </View>

      <Card style={styles.emptyCard}>
        <EmptyState
          title="No tasks scheduled yet"
          description="Once your team joins a project, tasks assigned to you and urgent milestone deadlines will appear here."
          icon={<Ionicons name="calendar-outline" size={40} color={colors.primary} />}
        />
      </Card>
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
  },
  header: {
    marginBottom: spacing.base,
  },
  greeting: {
    ...typography.titleLarge,
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  subGreeting: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  statusCard: {
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statusTitle: {
    ...typography.titleSmall,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  statusDescription: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.titleSmall,
    color: colors.textPrimary,
  },
  emptyCard: {
    paddingVertical: spacing.md,
  },
});
