import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { colors, radii, spacing, touchTargets, typography } from '@/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'destructive' | 'text';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  testID,
  accessibilityLabel,
  accessibilityHint,
}: ButtonProps) {
  const isInteractive = !disabled && !loading;

  const getContainerStyle = ({ pressed }: { pressed: boolean }): ViewStyle[] => {
    const list: ViewStyle[] = [
      styles.base,
      styles[`size_${size}`],
      styles[`variant_${variant}`],
    ];

    if (pressed && isInteractive) {
      list.push(styles[`pressed_${variant}`]);
    }

    if (!isInteractive) {
      list.push(styles.disabled);
      if (variant === 'outline') {
        list.push(styles.disabledOutline);
      }
    }

    return list;
  };

  const getTextStyle = (): TextStyle[] => {
    const list: TextStyle[] = [styles.textBase, styles[`text_${variant}`]];
    if (size === 'sm') {
      list.push(styles.text_sm);
    } else if (size === 'lg') {
      list.push(styles.text_lg);
    }

    if (!isInteractive) {
      list.push(styles.textDisabled);
    }
    return list;
  };

  const indicatorColor =
    variant === 'primary' || variant === 'destructive'
      ? colors.textInverse
      : colors.primary;

  return (
    <Pressable
      testID={testID}
      disabled={!isInteractive}
      onPress={isInteractive ? onPress : undefined}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{
        disabled: !isInteractive,
        busy: loading,
      }}
      style={({ pressed }) => [getContainerStyle({ pressed }), style]}
    >
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={indicatorColor} />
          <Text style={[getTextStyle(), styles.loadingText, textStyle]}>
            {title}
          </Text>
        </View>
      ) : (
        <View style={styles.contentContainer}>
          {leftIcon ? <View style={styles.iconLeft}>{leftIcon}</View> : null}
          <Text style={[getTextStyle(), textStyle]}>{title}</Text>
          {rightIcon ? <View style={styles.iconRight}>{rightIcon}</View> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touchTargets.minTouchSize,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginLeft: spacing.sm,
  },
  iconLeft: {
    marginRight: spacing.sm,
  },
  iconRight: {
    marginLeft: spacing.sm,
  },

  // Sizes
  size_sm: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  size_md: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  size_lg: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 52,
  },

  // Variants
  variant_primary: {
    backgroundColor: colors.primary,
  },
  pressed_primary: {
    backgroundColor: colors.primaryDark,
  },
  variant_secondary: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed_secondary: {
    backgroundColor: colors.surfaceHover,
  },
  variant_outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  pressed_outline: {
    backgroundColor: colors.primaryLight,
  },
  variant_destructive: {
    backgroundColor: colors.danger,
  },
  pressed_destructive: {
    backgroundColor: colors.dangerText,
  },
  variant_text: {
    backgroundColor: 'transparent',
    minHeight: touchTargets.minTouchSize,
  },
  pressed_text: {
    backgroundColor: colors.surfaceSubtle,
  },

  // Disabled states
  disabled: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: 'transparent',
    opacity: 0.65,
  },
  disabledOutline: {
    backgroundColor: 'transparent',
    borderColor: colors.borderMuted,
  },

  // Text
  textBase: {
    ...typography.button,
    textAlign: 'center',
  },
  text_sm: {
    fontSize: 13,
    lineHeight: 18,
  },
  text_lg: {
    fontSize: 16,
    lineHeight: 22,
  },
  text_primary: {
    color: colors.textInverse,
  },
  text_secondary: {
    color: colors.textPrimary,
  },
  text_outline: {
    color: colors.primary,
  },
  text_destructive: {
    color: colors.textInverse,
  },
  text_text: {
    color: colors.primary,
  },
  textDisabled: {
    color: colors.textMuted,
  },
});
