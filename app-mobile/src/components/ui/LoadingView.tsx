import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { colors, radii, shadows, spacing, typography } from '@/theme';

const melbondLogo = require('../../../assets/logo.png');

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
  const isTestEnv = process.env.NODE_ENV === 'test';
  const [pulseAnim] = useState(() => new Animated.Value(0.95));

  useEffect(() => {
    if (inline || isTestEnv) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.06,
          duration: 750,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.95,
          duration: 750,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [inline, isTestEnv, pulseAnim]);

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
      <Animated.View
        style={[
          styles.logoPulseBadge,
          !isTestEnv && { transform: [{ scale: pulseAnim }] },
        ]}
      >
        <Image
          source={melbondLogo}
          style={styles.logoImage}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      </Animated.View>
      <ActivityIndicator size={size} color={colors.primary} style={styles.spinner} />
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
    minHeight: 180,
    backgroundColor: colors.background,
  },
  logoPulseBadge: {
    width: 72,
    height: 72,
    borderRadius: radii.xxl,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  logoImage: {
    width: 56,
    height: 56,
  },
  spinner: {
    marginBottom: spacing.xs,
  },
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  text: {
    ...typography.label,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  inlineText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
});
