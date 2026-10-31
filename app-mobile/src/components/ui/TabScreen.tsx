import React from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleProp,
  StyleSheet,
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
 * header and render a large in-content title, so this applies the top
 * safe-area inset itself.
 */
export function TabScreen({
  children,
  refreshing,
  onRefresh,
  contentStyle,
  testID,
}: TabScreenProps) {
  const insets = useSafeAreaInsets();

  return (
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
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xxxl,
  },
});

