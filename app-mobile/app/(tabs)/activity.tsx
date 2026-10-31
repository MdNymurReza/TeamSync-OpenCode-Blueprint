import React from 'react';
import { StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Card, EmptyState, ScreenHeader, TabScreen } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function ActivityScreen() {
  return (
    <TabScreen>
      <ScreenHeader
        eyebrow="Updates"
        title="Activity & Updates"
        subtitle="Recent team actions, milestone changes, and meeting notes."
      />

      <Card style={styles.card}>
        <EmptyState
          title="No recent activity"
          description="Updates from your team will appear here in chronological order once you join an active project. Private project boundaries are strictly preserved."
          icon={<Ionicons name="notifications-outline" size={38} color={colors.primary} />}
        />
      </Card>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: spacing.xs,
  },
});
