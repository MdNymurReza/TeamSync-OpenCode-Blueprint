import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
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
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NotificationPreference,
  notificationsService,
} from '@/features/notifications';
import { colors, radii, spacing, touchTargets, typography } from '@/theme';

type PreferenceBooleanKey =
  | 'task_assignments'
  | 'task_updates'
  | 'mentions'
  | 'deadline_reminders'
  | 'meeting_reminders'
  | 'team_pulse_reminders'
  | 'minimize_lock_screen_content';

const PREFERENCE_ITEMS: {
  key: PreferenceBooleanKey;
  label: string;
  description: string;
}[] = [
  {
    key: 'task_assignments',
    label: 'Task Assignments',
    description: 'Notify when a task is assigned to you',
  },
  {
    key: 'deadline_reminders',
    label: 'Deadline & Milestone Reminders',
    description: 'Deduplicated alerts before due dates',
  },
  {
    key: 'meeting_reminders',
    label: 'Meeting & Minutes Reminders',
    description: 'Upcoming team syncs and action items',
  },
  {
    key: 'team_pulse_reminders',
    label: 'Weekly Team Pulse Check-ins',
    description: 'Optional weekly support & blocker check-in prompt',
  },
  {
    key: 'minimize_lock_screen_content',
    label: 'Minimize Lock-Screen Content (Privacy)',
    description: 'Hide private task/project titles on Android lock screens',
  },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, isConfigured, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const [prefs, setPrefs] = useState<Omit<NotificationPreference, 'user_id' | 'updated_at'>>(
    DEFAULT_NOTIFICATION_PREFERENCES
  );

  useEffect(() => {
    if (!isConfigured || !user || !notificationsService?.fetchNotificationPreferences) {
      return;
    }

    let isMounted = true;
    (async () => {
      const { data } = await notificationsService.fetchNotificationPreferences();
      if (isMounted && data) {
        setPrefs({
          task_assignments: data.task_assignments,
          task_updates: data.task_updates,
          mentions: data.mentions,
          deadline_reminders: data.deadline_reminders,
          meeting_reminders: data.meeting_reminders,
          team_pulse_reminders: data.team_pulse_reminders,
          minimize_lock_screen_content: data.minimize_lock_screen_content,
        });
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isConfigured, user]);

  const handleTogglePreference = async (key: PreferenceBooleanKey) => {
    const nextValue = !prefs[key];
    setPrefs((prev) => ({ ...prev, [key]: nextValue }));

    if (isConfigured && user && notificationsService?.updateNotificationPreferences) {
      const { error } = await notificationsService.updateNotificationPreferences({
        [key]: nextValue,
      });
      if (error) {
        Alert.alert('Could not save preference', error.message);
      }
    }
  };

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
        subtitle="Manage your student credentials, notifications, and workspace session."
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

      {/* Notification Preferences & Privacy Section */}
      <SectionHeader title="Notifications & Privacy" />
      <Card style={styles.prefsCard}>
        {PREFERENCE_ITEMS.map((item, idx) => {
          const isEnabled = prefs[item.key];
          return (
            <Pressable
              key={item.key}
              onPress={() => handleTogglePreference(item.key)}
              accessibilityRole="switch"
              accessibilityState={{ checked: isEnabled }}
              accessibilityLabel={`Toggle ${item.label}`}
              style={[styles.prefRow, idx > 0 && styles.detailRowBorder]}
            >
              <View style={styles.prefTextCol}>
                <Text style={styles.prefTitle}>{item.label}</Text>
                <Text style={styles.prefSub}>{item.description}</Text>
              </View>
              <View
                style={[
                  styles.togglePill,
                  isEnabled ? styles.togglePillOn : styles.togglePillOff,
                ]}
              >
                <Text
                  style={[
                    styles.togglePillText,
                    isEnabled ? styles.togglePillTextOn : styles.togglePillTextOff,
                  ]}
                >
                  {isEnabled ? 'ON' : 'OFF'}
                </Text>
              </View>
            </Pressable>
          );
        })}

        <View style={styles.androidNoticeBox}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.androidNoticeText}>
            Android OS note: background delivery requires notification permission and may be
            deferred during Doze / battery optimization or when push provider credentials are
            not configured.
          </Text>
        </View>
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
  prefsCard: {
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: touchTargets.minTouchSize,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  prefTextCol: {
    flex: 1,
  },
  prefTitle: {
    ...typography.label,
    color: colors.textPrimary,
  },
  prefSub: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  togglePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  togglePillOn: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  togglePillOff: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
  },
  togglePillText: {
    ...typography.caption,
    fontWeight: '700',
  },
  togglePillTextOn: {
    color: colors.primary,
  },
  togglePillTextOff: {
    color: colors.textMuted,
  },
  androidNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  androidNoticeText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
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
