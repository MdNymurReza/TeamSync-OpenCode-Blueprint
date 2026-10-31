import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Card, EmptyState } from '@/components/ui';
import { colors, spacing, typography } from '@/theme';

export default function ActivityScreen() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      accessibilityRole="scrollview"
    >
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          Activity & Updates
        </Text>
        <Text style={styles.subtitle}>
          Recent team actions, milestone changes, and meeting notes.
        </Text>
      </View>

      <Card style={styles.card}>
        <EmptyState
          title="No recent activity"
          description="Updates from your team will appear here in chronological order once you join an active project. Private project boundaries are strictly preserved."
          icon={<Ionicons name="notifications-outline" size={44} color={colors.primary} />}
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
    paddingVertical: spacing.md,
  },
});
