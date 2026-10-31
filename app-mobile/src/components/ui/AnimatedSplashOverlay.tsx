import React, { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, radii, shadows, spacing, typography } from '@/theme';

const melbondLogo = require('../../../assets/logo.png');

export interface AnimatedSplashOverlayProps {
  /** Whether auth/session initialization is still loading */
  isAppReady?: boolean;
  /** Minimum duration (ms) to keep the splash visible so the entrance feels intentional */
  durationMs?: number;
  testID?: string;
}

/**
 * Animated launch splash screen featuring the MelBond logo (`assets/logo.png`),
 * spring-scaled badge entrance, ambient halo pulse, and smooth fade-out dismissal.
 * Automatically skips blocking in Jest (`process.env.NODE_ENV === 'test'`) unless
 * explicitly tested via `testID`.
 */
export function AnimatedSplashOverlay({
  isAppReady = true,
  durationMs = 1350,
  testID = 'melbond-animated-splash',
}: AnimatedSplashOverlayProps) {
  const isTestEnv = process.env.NODE_ENV === 'test';
  const [isVisible, setIsVisible] = useState(!isTestEnv);

  const [containerOpacity] = useState(() => new Animated.Value(1));
  const [logoScale] = useState(() => new Animated.Value(0.82));
  const [logoOpacity] = useState(() => new Animated.Value(0));
  const [textTranslateY] = useState(() => new Animated.Value(14));
  const [textOpacity] = useState(() => new Animated.Value(0));
  const [pulseScale] = useState(() => new Animated.Value(0.92));
  const [pulseOpacity] = useState(() => new Animated.Value(0.35));
  const [barProgress] = useState(() => new Animated.Value(0.15));

  useEffect(() => {
    if (!isVisible) return;

    // 1. Entrance spring + staggered subtitle + progress bar sweep
    const entranceAnim = Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 65,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(160),
        Animated.parallel([
          Animated.timing(textOpacity, {
            toValue: 1,
            duration: 380,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(textTranslateY, {
            toValue: 0,
            duration: 380,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),
      Animated.timing(barProgress, {
        toValue: 1,
        duration: Math.max(600, durationMs - 250),
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    // 2. Ambient halo breathing loop
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseScale, {
            toValue: 1.12,
            duration: 900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0.65,
            duration: 900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseScale, {
            toValue: 0.94,
            duration: 900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0.28,
            duration: 900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    entranceAnim.start();
    pulseLoop.start();

    return () => {
      entranceAnim.stop();
      pulseLoop.stop();
    };
  }, [
    barProgress,
    durationMs,
    isVisible,
    logoOpacity,
    logoScale,
    pulseOpacity,
    pulseScale,
    textOpacity,
    textTranslateY,
  ]);

  useEffect(() => {
    if (!isVisible || !isAppReady) return;

    const timer = setTimeout(() => {
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 340,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setIsVisible(false);
        }
      });
    }, durationMs);

    return () => clearTimeout(timer);
  }, [containerOpacity, durationMs, isAppReady, isVisible]);

  if (!isVisible) {
    return null;
  }

  return (
    <Animated.View
      testID={testID}
      pointerEvents="auto"
      accessibilityLabel="Launching MelBond workspace"
      style={[styles.overlay, { opacity: containerOpacity }]}
    >
      {/* Decorative Ambient Orbs matching MelBond Azure + Mint palette */}
      <View style={styles.orbTopRight} />
      <View style={styles.orbBottomLeft} />

      <View style={styles.centerContent}>
        <View style={styles.logoStage}>
          <Animated.View
            style={[
              styles.haloRing,
              {
                opacity: pulseOpacity,
                transform: [{ scale: pulseScale }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.logoCard,
              {
                opacity: logoOpacity,
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            <Image
              source={melbondLogo}
              style={styles.logoImage}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          </Animated.View>
        </View>

        <Animated.View
          style={[
            styles.textBlock,
            {
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }],
            },
          ]}
        >
          <View style={styles.pillRow}>
            <View style={styles.liveDot} />
            <Text style={styles.pillText}>UNIVERSITY TEAM WORKSPACE</Text>
          </View>
          <Text style={styles.tagline}>
            One project. One organized student workspace.
          </Text>

          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  transform: [{ scaleX: barProgress }],
                },
              ]}
            />
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    overflow: 'hidden',
  },
  orbTopRight: {
    position: 'absolute',
    top: -90,
    right: -70,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#E0F2FE',
    opacity: 0.7,
  },
  orbBottomLeft: {
    position: 'absolute',
    bottom: -100,
    left: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#CCFBF1',
    opacity: 0.65,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  logoStage: {
    width: 210,
    height: 210,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  haloRing: {
    position: 'absolute',
    width: 204,
    height: 204,
    borderRadius: 56,
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: colors.primaryBorder,
  },
  logoCard: {
    width: 176,
    height: 176,
    borderRadius: 44,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.raised,
  },
  logoImage: {
    width: 152,
    height: 152,
  },
  textBlock: {
    alignItems: 'center',
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryBorder,
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    marginBottom: spacing.sm,
    gap: 6,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.brandMint,
  },
  pillText: {
    ...typography.overline,
    color: colors.primary,
    letterSpacing: 1,
  },
  tagline: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  progressTrack: {
    width: 148,
    height: 5,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSubtle,
    overflow: 'hidden',
  },
  progressFill: {
    width: '100%',
    height: '100%',
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
});
