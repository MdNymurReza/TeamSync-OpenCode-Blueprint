import React, { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  RefreshControl,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';

export interface TabScreenProps {
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Scroll container for top-level tab screens. Tab screens hide the native
 * header and render a large in-content title, with a subtle ambient top glow
 * and smooth entrance fade/translate animation.
 */
export function TabScreen({
  children,
  refreshing,
  onRefresh,
  contentStyle,
  testID,
}: TabScreenProps) {
  const insets = useSafeAreaInsets();
  const isTestEnv = process.env.NODE_ENV === 'test';
  const [fadeAnim] = useState(() => new Animated.Value(isTestEnv ? 1 : 0));
  const [translateYAnim] = useState(() => new Animated.Value(isTestEnv ? 0 : 12));

  useEffect(() => {
    if (isTestEnv) return;
    const anim = Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [fadeAnim, isTestEnv, translateYAnim]);

  return (
    <View style={styles.root}>
      {/* Subtle decorative ambient blobs for visual depth */}
      <View pointerEvents="none" style={styles.ambientTopRight} />
      <View pointerEvents="none" style={styles.ambientTopLeft} />

      <ScrollView
        testID={testID}
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.lg },
          contentStyle,
        ]}
        accessibilityRole="scrollview"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={Boolean(refreshing)}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          ) : undefined
        }
      >
        <Animated.View
          style={
            !isTestEnv
              ? {
                  opacity: fadeAnim,
                  transform: [{ translateY: translateYAnim }],
                }
              : undefined
          }
        >
          {children}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  ambientTopRight: {
    position: 'absolute',
    top: -110,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#E0F2FE',
    opacity: 0.55,
  },
  ambientTopLeft: {
    position: 'absolute',
    top: 40,
    left: -120,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#EEF2FF',
    opacity: 0.6,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xxxl,
  },
});
