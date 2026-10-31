import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Badge, Button, Card } from '@/components/ui';
import { useAuth } from '@/features/auth';
import { colors, radii, spacing, typography } from '@/theme';

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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      accessibilityRole="scrollview"
    >
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          Profile & Account
        </Text>
        <Text style={styles.subtitle}>
          Manage your student credentials and workspace session.
        </Text>
      </View>

      {/* Backend Connection Status */}
      <Card style={styles.card}>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Backend Status</Text>
          {isConfigured ? (
            <Badge
              variant="success"
              label="Supabase Connected"
              icon={<Ionicons name="cloud-done-outline" size={14} color={colors.successText} />}
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

      {/* User Information */}
      <Card style={styles.card}>
        <View style={styles.avatarRow}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={32} color={colors.primary} />
          </View>
          <View style={styles.avatarInfo}>
            <Text style={styles.userName}>
              {profile?.full_name ?? user?.email ?? 'Student Member'}
            </Text>
            <Text style={styles.userEmail}>{user?.email ?? 'No active session'}</Text>
          </View>
        </View>

        {user ? (
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>University</Text>
              <Text style={styles.detailValue}>
                {profile?.university ?? 'Not specified'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Department</Text>
              <Text style={styles.detailValue}>
                {profile?.department ?? 'General'}
              </Text>
            </View>
          </View>
        ) : null}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.base,
    paddingBottom: spacing.xxxl,
  },
  header: {
    marginBottom: spacing.base,
  },
  title: {
    ...typography.titleLarge,
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  card: {
    marginBottom: spacing.base,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    ...typography.bodyMedium,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarInfo: {
    flex: 1,
  },
  userName: {
    ...typography.titleSmall,
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  userEmail: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  detailsContainer: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  detailLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  detailValue: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  actionSection: {
    marginTop: spacing.md,
  },
});
