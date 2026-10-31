import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { colors, spacing, typography } from '@/theme';
import { Button } from './Button';

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionTitle?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  actionTitle,
  onAction,
  style,
  testID,
}: EmptyStateProps) {
  return (
    <View
      testID={testID}
      style={[styles.container, style]}
      accessible={true}
      accessibilityRole="summary"
    >
      {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.description}>{description}</Text>
      {actionTitle && onAction ? (
        <View style={styles.actionContainer}>
          <Button title={actionTitle} onPress={onAction} variant="primary" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  iconContainer: {
    marginBottom: spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.titleSmall,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
    marginBottom: spacing.base,
  },
  actionContainer: {
    marginTop: spacing.xs,
    width: '100%',
    maxWidth: 240,
  },
});
