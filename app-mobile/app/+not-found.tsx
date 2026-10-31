import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Link, Stack } from 'expo-router';

import { EmptyState } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Page Not Found', headerShown: true }} />
      <View style={styles.container}>
        <EmptyState
          icon="alert-circle-outline"
          title="Page Not Found"
          description="The screen you're looking for doesn't exist or has moved."
        />
        <Link href="/(tabs)" style={styles.link}>
          Return to MelBond Home
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  link: {
    marginTop: spacing.md,
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: spacing.sm,
  },
});
