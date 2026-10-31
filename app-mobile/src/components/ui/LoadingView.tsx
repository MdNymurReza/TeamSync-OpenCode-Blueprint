import React from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { colors, spacing, typography } from '@/theme';

export interface LoadingViewProps {
  message?: string;
  size?: 'small' | 'large';
  inline?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function LoadingView({
  message = 'Loading...',
  size = 'large',
  inline = false,
  style,
  testID,
}: LoadingViewProps) {
  if (inline) {
    return (
      <View
        testID={testID}
        style={[styles.inlineContainer, style]}
        accessible={true}
        accessibilityRole="progressbar"
        accessibilityLabel={message}
      >
        <ActivityIndicator size="small" color={colors.primary} />
        {message ? <Text style={styles.inlineText}>{message}</Text> : null}
      </View>
    );
  }

  return (
    <View
      testID={testID}
      style={[styles.fullContainer, style]}
      accessible={true}
      accessibilityRole="progressbar"
      accessibilityLabel={message}
    >
      <ActivityIndicator size={size} color={colors.primary} />
      {message ? <Text style={styles.text}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fullContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    minHeight: 160,
  },
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  text: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  inlineText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
});
