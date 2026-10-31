import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { colors, radii, spacing, typography } from '@/theme';

export type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'primary';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  icon?: React.ReactNode;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

export function Badge({
  label,
  variant = 'default',
  icon,
  size = 'md',
  style,
  textStyle,
  accessibilityLabel,
  testID,
}: BadgeProps) {
  const containerStyles: ViewStyle[] = [
    styles.base,
    styles[`size_${size}`],
    styles[`variant_${variant}`],
  ];

  const textStyles: TextStyle[] = [
    styles.textBase,
    styles[`textSize_${size}`],
    styles[`textVariant_${variant}`],
  ];

  return (
    <View
      testID={testID}
      style={[containerStyles, style]}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel ?? `${variant} status: ${label}`}
    >
      {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
      <Text style={[textStyles, textStyle]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radii.full,
    borderWidth: 1,
  },
  iconContainer: {
    marginRight: spacing.xs,
  },
  size_sm: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  size_md: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  textBase: {
    ...typography.caption,
    fontWeight: '600',
  },
  textSize_sm: {
    fontSize: 11,
    lineHeight: 14,
  },
  textSize_md: {
    fontSize: 12,
    lineHeight: 16,
  },

  // Variant backgrounds & borders
  variant_default: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
  },
  variant_primary: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryBorder,
  },
  variant_success: {
    backgroundColor: colors.successBg,
    borderColor: colors.successBorder,
  },
  variant_warning: {
    backgroundColor: colors.warningBg,
    borderColor: colors.warningBorder,
  },
  variant_danger: {
    backgroundColor: colors.dangerBg,
    borderColor: colors.dangerBorder,
  },
  variant_info: {
    backgroundColor: colors.infoBg,
    borderColor: colors.infoBorder,
  },

  // Text variant colors (contrast checked)
  textVariant_default: {
    color: colors.textSecondary,
  },
  textVariant_primary: {
    color: colors.primary,
  },
  textVariant_success: {
    color: colors.successText,
  },
  textVariant_warning: {
    color: colors.warningText,
  },
  textVariant_danger: {
    color: colors.dangerText,
  },
  textVariant_info: {
    color: colors.infoText,
  },
});
