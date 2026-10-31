import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import {
  Avatar,
  Badge,
  Button,
  Card,
  IconTile,
  ScreenHeader,
  SectionHeader,
  TabScreen,
} from '@/components/ui';
import { useAuth } from '@/features/auth';
import { colors, spacing, typography } from '@/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, isConfigured, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of your MelBond account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setIsSigningOut(true);
            await signOut();
            setIsSigningOut(false);
            router.replace('/(auth)/sign-in');
          },
        },
      ]
    );
  };

  const displayName = profile?.full_name ?? user?.email ?? 'Student Member';

  return (
    <TabScreen>
      <ScreenHeader
        eyebrow="Settings"
        title="Profile & Account"
        subtitle="Manage your student credentials and workspace session."
      />

      {/* User Hero Card */}
      <Card style={styles.heroCard}>
        <View style={styles.avatarRow}>
          <Avatar name={displayName} size={56} />
          <View style={styles.avatarInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.userEmail} numberOfLines={1}>
              {user?.email ?? 'No active session'}
            </Text>
          </View>
        </View>

        {user ? (
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <View style={styles.detailLabelRow}>
                <IconTile name="school-outline" tone="neutral" size={32} />
                <Text style={styles.detailLabel}>University</Text>
              </View>
              <Text style={styles.detailValue} numberOfLines={1}>
                {profile?.university ?? 'Not specified'}
              </Text>
            </View>
            <View style={[styles.detailRow, styles.detailRowBorder]}>
              <View style={styles.detailLabelRow}>
                <IconTile name="book-outline" tone="neutral" size={32} />
                <Text style={styles.detailLabel}>Department</Text>
              </View>
              <Text style={styles.detailValue} numberOfLines={1}>
                {profile?.department ?? 'General'}
              </Text>
            </View>
          </View>
        ) : null}
      </Card>

      {/* Backend Connection Status */}
      <SectionHeader title="Connection" />
      <Card style={styles.statusCard}>
        <View style={styles.statusRow}>
          <View style={styles.statusTitleRow}>
            <IconTile
              name={isConfigured ? 'cloud-done-outline' : 'warning-outline'}
              tone={isConfigured ? 'success' : 'warning'}
              size={36}
            />
            <Text style={styles.statusLabel}>Backend Status</Text>
          </View>
          {isConfigured ? (
            <Badge
              variant="success"
              label="Supabase Connected"
              icon={<Ionicons name="checkmark-circle" size={14} color={colors.successText} />}
            />
          ) : (
            <Badge
              variant="warning"
              label="Unconfigured (.env.local)"
              icon={<Ionicons name="warning-outline" size={14} color={colors.warningText} />}
            />
          )}
        </View>
      </Card>

      {/* Session Actions */}
      <View style={styles.actionSection}>
        {user ? (
          <Button
            title="Sign Out"
            onPress={handleSignOut}
            loading={isSigningOut}
            variant="destructive"
            size="lg"
            leftIcon={<Ionicons name="log-out-outline" size={18} color={colors.textInverse} />}
          />
        ) : (
          <Button
            title="Sign In to MelBond"
            onPress={() => router.push('/(auth)/sign-in')}
            variant="primary"
            size="lg"
            leftIcon={<Ionicons name="log-in-outline" size={18} color={colors.textInverse} />}
          />
        )}
      </View>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    marginBottom: spacing.lg,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  userName: {
    ...typography.titleMedium,
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  userEmail: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  detailsContainer: {
    marginTop: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  detailRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  detailLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailLabel: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  detailValue: {
    ...typography.label,
    color: colors.textPrimary,
    marginLeft: spacing.md,
    flexShrink: 1,
  },
  statusCard: {
    marginBottom: spacing.lg,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statusTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusLabel: {
    ...typography.label,
    color: colors.textPrimary,
  },
  actionSection: {
    marginTop: spacing.xs,
  },
});
