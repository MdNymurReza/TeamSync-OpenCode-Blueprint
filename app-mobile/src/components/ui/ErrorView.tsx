import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { colors, radii, spacing, typography } from '@/theme';
import { Button } from './Button';

export interface ErrorViewProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryTitle?: string;
  inline?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function ErrorView({
  title = 'Something went wrong',
  message,
  onRetry,
  retryTitle = 'Try Again',
  inline = false,
  style,
  testID,
}: ErrorViewProps) {
  if (inline) {
    return (
      <View
        testID={testID}
        style={[styles.inlineContainer, style]}
        accessible={true}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
      >
        <View style={styles.inlineContent}>
          <View style={styles.inlineIcon} importantForAccessibility="no-hide-descendants">
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
          </View>
          <Text style={styles.inlineMessage}>{message}</Text>
          {onRetry ? (
            <Button
              title={retryTitle}
              onPress={onRetry}
              variant="text"
              size="sm"
              style={styles.inlineButton}
            />
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View
      testID={testID}
      style={[styles.fullContainer, style]}
      accessible={true}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
    >
      <View style={styles.card}>
        <View style={styles.iconCircle} importantForAccessibility="no-hide-descendants">
          <Ionicons name="cloud-offline-outline" size={28} color={colors.danger} />
        </View>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <Text style={styles.message}>{message}</Text>
        {onRetry ? (
          <View style={styles.buttonContainer}>
            <Button
              title={retryTitle}
              onPress={onRetry}
              variant="primary"
              size="md"
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullContainer: {
    padding: spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing.lg,
    width: '100%',
    alignItems: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.titleSmall,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  message: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.base,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 200,
  },
  inlineContainer: {
    backgroundColor: colors.dangerBg,
    borderColor: colors.dangerBorder,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inlineContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inlineIcon: {
    marginRight: spacing.sm,
  },
  inlineMessage: {
    ...typography.bodyMedium,
    color: colors.dangerText,
    flex: 1,
    marginRight: spacing.sm,
  },
  inlineButton: {
    minHeight: 36,
  },
});
