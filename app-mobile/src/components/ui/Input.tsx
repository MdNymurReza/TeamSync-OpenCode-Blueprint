import React, { useState } from 'react';
import {
  KeyboardTypeOptions,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { colors, radii, spacing, touchTargets, typography } from '@/theme';

export interface InputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  helperText?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  editable?: boolean;
  autoFocus?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  leftIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  helperText,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoCorrect = true,
  editable = true,
  autoFocus = false,
  multiline = false,
  numberOfLines = 1,
  leftIcon,
  style,
  inputStyle,
  testID,
  accessibilityLabel,
  accessibilityHint,
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordHidden, setIsPasswordHidden] = useState(secureTextEntry);

  const hasError = Boolean(error);

  const getContainerStyle = (): ViewStyle[] => {
    const list: ViewStyle[] = [styles.inputContainer];
    if (isFocused) {
      list.push(styles.inputFocused);
    }
    if (hasError) {
      list.push(styles.inputError);
    }
    if (!editable) {
      list.push(styles.inputDisabled);
    }
    return list;
  };

  return (
    <View style={[styles.wrapper, style]}>
      <Text style={styles.label} accessibilityRole="text">
        {label}
      </Text>

      <View collapsable={false} style={getContainerStyle()}>
        {leftIcon ? <View style={styles.leftIconContainer}>{leftIcon}</View> : null}

        <TextInput
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={isPasswordHidden}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          editable={editable}
          autoFocus={autoFocus}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : undefined}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityHint={accessibilityHint}
          aria-invalid={hasError}
          style={[styles.input, multiline && styles.inputMultiline, inputStyle]}
        />

        {secureTextEntry ? (
          <Pressable
            onPress={() => setIsPasswordHidden((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel={isPasswordHidden ? 'Show password' : 'Hide password'}
            style={styles.eyeButton}
          >
            <Ionicons
              name={isPasswordHidden ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={colors.textSecondary}
            />
          </Pressable>
        ) : null}
      </View>

      {hasError ? (
        <Text style={styles.errorText} accessibilityRole="alert">
          {error}
        </Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.base,
    width: '100%',
  },
  label: {
    ...typography.label,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
  },
  inputFocused: {
    borderColor: colors.borderFocus,
    backgroundColor: colors.surface,
  },
  inputError: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerBg,
  },
  inputDisabled: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
    opacity: 0.7,
  },
  leftIconContainer: {
    marginRight: spacing.sm,
  },
  input: {
    fontSize: typography.bodyLarge.fontSize,
    fontWeight: typography.bodyLarge.fontWeight,
    color: colors.textPrimary,
    flex: 1,
    paddingVertical: spacing.sm,
  },
  inputMultiline: {
    lineHeight: typography.bodyLarge.lineHeight,
    textAlignVertical: 'top',
  },
  eyeButton: {
    padding: spacing.xs,
    minHeight: touchTargets.minTouchSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    ...typography.caption,
    color: colors.dangerText,
    marginTop: spacing.xxs,
  },
  helperText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xxs,
  },
});
