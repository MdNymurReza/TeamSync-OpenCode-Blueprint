import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';

import {
  Avatar,
  Badge,
  Button,
  Card,
  IconTile,
  Input,
  ScreenHeader,
  SectionHeader,
  TabScreen,
  useToast,
} from '@/components/ui';
import { useAuth } from '@/features/auth';
import { DashboardSummary, milestonesService } from '@/features/milestones';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NotificationPreference,
  notificationsService,
} from '@/features/notifications';
import { colors, radii, shadows, spacing, touchTargets, typography } from '@/theme';

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

const AVATAR_PHOTO_PRESETS: {
  id: string;
  label: string;
  subtitle: string;
  url: string;
}[] = [
  {
    id: 'scholar-azure',
    label: 'AI & CS Scholar',
    subtitle: 'Azure Studio Portrait',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'eng-lead',
    label: 'Engineering Lead',
    subtitle: 'Modern Campus Portrait',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'data-science',
    label: 'Data Researcher',
    subtitle: 'Lab & Analytics Portrait',
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'design-ux',
    label: 'Product & UX',
    subtitle: 'Creative Studio Portrait',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
  },
];

export function isValidAvatarUri(uri?: string | null): boolean {
  if (!uri) return false;
  const u = uri.trim();
  return (
    u.startsWith('https://') ||
    u.startsWith('http://') ||
    u.startsWith('file://') ||
    u.startsWith('content://') ||
    u.startsWith('data:image/')
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const toast = useToast();
  const { user, profile, isConfigured, signOut, updateProfile } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Local profile overrides so updates reflect immediately even when testing offline
  const [localFullName, setLocalFullName] = useState<string | null>(null);
  const [localUniversity, setLocalUniversity] = useState<string | null>(null);
  const [localDepartment, setLocalDepartment] = useState<string | null>(null);
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null | undefined>(
    undefined
  );

  // Edit Profile Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editNameInput, setEditNameInput] = useState('');
  const [editUniversityInput, setEditUniversityInput] = useState('');
  const [editDepartmentInput, setEditDepartmentInput] = useState('');
  const [editAvatarInput, setEditAvatarInput] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Avatar Upload Modal state
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [avatarDraftUrl, setAvatarDraftUrl] = useState('');
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Activity & Contribution Summary
  const [activitySummary, setActivitySummary] = useState<DashboardSummary | null>(null);

  const [prefs, setPrefs] = useState<Omit<NotificationPreference, 'user_id' | 'updated_at'>>(
    DEFAULT_NOTIFICATION_PREFERENCES
  );

  useEffect(() => {
    if (!isConfigured || !user) {
      return;
    }

    let isMounted = true;
    (async () => {
      const [prefsRes, dashRes] = await Promise.all([
        notificationsService?.fetchNotificationPreferences
          ? notificationsService.fetchNotificationPreferences()
          : Promise.resolve({ data: null, error: null }),
        milestonesService?.fetchDashboardSummary
          ? milestonesService.fetchDashboardSummary(user.id)
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (!isMounted) return;

      if (prefsRes.data) {
        setPrefs({
          task_assignments: prefsRes.data.task_assignments,
          task_updates: prefsRes.data.task_updates,
          mentions: prefsRes.data.mentions,
          deadline_reminders: prefsRes.data.deadline_reminders,
          meeting_reminders: prefsRes.data.meeting_reminders,
          team_pulse_reminders: prefsRes.data.team_pulse_reminders,
          minimize_lock_screen_content: prefsRes.data.minimize_lock_screen_content,
        });
      }

      if (dashRes.data) {
        setActivitySummary(dashRes.data);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isConfigured, user]);

  const effectiveFullName =
    localFullName ?? profile?.full_name ?? user?.email?.split('@')[0] ?? 'Student Member';
  const effectiveEmail = profile?.email ?? user?.email ?? 'student@university.edu';
  const effectiveUniversity =
    localUniversity ?? profile?.university ?? 'University Campus Workspace';
  const effectiveDepartment =
    localDepartment ?? profile?.department ?? 'Computer Science & Engineering';
  const effectiveAvatarUrl =
    localAvatarUrl !== undefined ? localAvatarUrl : (profile?.avatar_url ?? null);

  const studentIdCode = user?.id
    ? `MB-${user.id.slice(0, 8).toUpperCase()}`
    : 'MB-STUDENT-01';
  const memberSinceDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString()
    : 'Active Academic Term';
  const lastUpdatedDate = profile?.updated_at
    ? new Date(profile.updated_at).toLocaleDateString()
    : 'Synced Today';

  const openEditProfileModal = () => {
    setEditNameInput(effectiveFullName);
    setEditUniversityInput(
      localUniversity ?? profile?.university ?? ''
    );
    setEditDepartmentInput(
      localDepartment ?? profile?.department ?? ''
    );
    setEditAvatarInput(effectiveAvatarUrl ?? '');
    setEditError(null);
    setIsEditModalOpen(true);
  };

  const handleSaveProfileDetails = async () => {
    const trimmedName = editNameInput.trim();
    if (!trimmedName) {
      setEditError('Full name is required.');
      return;
    }

    const trimmedAvatar = editAvatarInput.trim();
    if (trimmedAvatar && !isValidAvatarUri(trimmedAvatar)) {
      setEditError(
        'Profile picture must be a valid image URL (https://), device photo, or portrait preset.'
      );
      return;
    }

    setIsSavingProfile(true);
    setEditError(null);

    if (updateProfile) {
      const { error } = await updateProfile({
        fullName: trimmedName,
        university: editUniversityInput.trim() || null,
        department: editDepartmentInput.trim() || null,
        avatarUrl: trimmedAvatar || null,
      });
      if (error) {
        setIsSavingProfile(false);
        setEditError(error.message);
        return;
      }
    }

    setLocalFullName(trimmedName);
    setLocalUniversity(editUniversityInput.trim() || 'Not specified');
    setLocalDepartment(editDepartmentInput.trim() || 'General');
    setLocalAvatarUrl(trimmedAvatar || null);
    setIsSavingProfile(false);
    setIsEditModalOpen(false);
    toast.showSuccess('Profile details saved successfully', 'Dossier Updated');
  };

  const openAvatarUploadModal = () => {
    setAvatarDraftUrl(effectiveAvatarUrl ?? '');
    setAvatarUploadError(null);
    setIsAvatarModalOpen(true);
  };

  const handlePickFromLibrary = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setAvatarUploadError('Photo library permission is required to choose a profile photo.');
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!res.canceled && res.assets && res.assets[0]) {
        const asset = res.assets[0];
        const selectedUri = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        setAvatarDraftUrl(selectedUri);
        setAvatarUploadError(null);
      }
    } catch {
      setAvatarUploadError('Could not open device photo library.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setAvatarUploadError('Camera permission is required to take a profile picture.');
        return;
      }

      const res = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!res.canceled && res.assets && res.assets[0]) {
        const asset = res.assets[0];
        const selectedUri = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        setAvatarDraftUrl(selectedUri);
        setAvatarUploadError(null);
      }
    } catch {
      setAvatarUploadError('Could not open camera.');
    }
  };

  const handleSaveAvatarPhoto = async (overrideUrl?: string | null) => {
    const nextUrl =
      overrideUrl !== undefined ? overrideUrl : avatarDraftUrl.trim() || null;

    if (nextUrl && !isValidAvatarUri(nextUrl)) {
      setAvatarUploadError(
        'Please enter a valid https:// image URL, pick a photo from your device, or choose a portrait preset below.'
      );
      return;
    }

    setIsUploadingAvatar(true);
    setAvatarUploadError(null);

    if (updateProfile) {
      const { error } = await updateProfile({
        avatarUrl: nextUrl,
      });
      if (error) {
        setIsUploadingAvatar(false);
        setAvatarUploadError(error.message);
        return;
      }
    }

    setLocalAvatarUrl(nextUrl);
    setIsUploadingAvatar(false);
    setIsAvatarModalOpen(false);
    toast.showSuccess(
      nextUrl ? 'Profile picture updated successfully' : 'Reset to initials avatar',
      'Studio Portrait'
    );
  };

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

  const activeWorkspacesCount = activitySummary?.activeProjectCount ?? 0;
  const completedTasksCount = activitySummary?.completedTasksCount ?? 0;
  const assignedQueueCount = activitySummary?.myAssignedTasks.length ?? 0;
  const completionRatePct = activitySummary?.overallTaskProgressPercent ?? 0;

  return (
    <TabScreen>
      <ScreenHeader
        eyebrow="Student Identity & Settings"
        title="Profile & Account"
        subtitle="Manage your academic profile, profile picture, notifications, and workspace session."
      />

      {/* 1. Executive Student Profile Hero Card */}
      <Card style={styles.heroCard} variant="elevated" testID="profile-hero-card">
        <View style={styles.heroAccentBar} />

        <View style={styles.heroBadgeRow}>
          <View style={styles.verifiedPill}>
            <View style={styles.verifiedDot} />
            <Text style={styles.verifiedPillText}>
              {user ? 'VERIFIED STUDENT PROFILE' : 'STUDENT PROFILE'}
            </Text>
          </View>
          <Badge label={studentIdCode} variant="primary" size="sm" />
        </View>

        <View style={styles.avatarRow}>
          <View style={styles.avatarContainer}>
            <Avatar
              name={effectiveFullName}
              avatarUrl={effectiveAvatarUrl}
              size={80}
              testID="profile-main-avatar"
            />
            <Pressable
              testID="open-avatar-upload-button"
              accessibilityRole="button"
              accessibilityLabel="Upload or change profile picture"
              onPress={openAvatarUploadModal}
              style={styles.cameraOverlayBtn}
            >
              <Ionicons name="camera" size={16} color={colors.textInverse} />
            </Pressable>
          </View>

          <View style={styles.avatarInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              {effectiveFullName}
            </Text>
            <Text style={styles.userEmail} numberOfLines={1}>
              {user ? effectiveEmail : 'No active session'}
            </Text>
            <Text style={styles.userAcademicSub} numberOfLines={1}>
              {effectiveDepartment} • {effectiveUniversity}
            </Text>
          </View>
        </View>

        {/* Profile Picture & Edit Profile Action Buttons */}
        <View style={styles.heroActionsRow}>
          <Button
            testID="upload-profile-photo-button"
            title={effectiveAvatarUrl ? 'Change Photo' : 'Upload Photo'}
            variant="soft"
            size="sm"
            style={styles.heroActionBtn}
            leftIcon={<Ionicons name="image-outline" size={16} color={colors.primaryDark} />}
            onPress={openAvatarUploadModal}
          />
          <Button
            testID="open-edit-profile-button"
            title="Edit Full Details"
            variant="secondary"
            size="sm"
            style={styles.heroActionBtn}
            leftIcon={<Ionicons name="create-outline" size={16} color={colors.textPrimary} />}
            onPress={openEditProfileModal}
          />
        </View>

        {/* 4-Column Academic Activity & Workload KPI Strip */}
        <View style={styles.kpiStrip}>
          <View style={styles.kpiTile}>
            <Text style={styles.kpiValue}>{activeWorkspacesCount}</Text>
            <Text style={styles.kpiLabel}>Workspaces</Text>
          </View>
          <View style={styles.kpiTile}>
            <Text style={[styles.kpiValue, { color: colors.brandMint }]}>
              {completedTasksCount}
            </Text>
            <Text style={styles.kpiLabel}>Done Tasks</Text>
          </View>
          <View style={styles.kpiTile}>
            <Text style={[styles.kpiValue, { color: colors.primary }]}>
              {assignedQueueCount}
            </Text>
            <Text style={styles.kpiLabel}>Active Load</Text>
          </View>
          <View style={styles.kpiTile}>
            <Text style={styles.kpiValue}>{completionRatePct}%</Text>
            <Text style={styles.kpiLabel}>Completion</Text>
          </View>
        </View>
      </Card>

      {/* 2. Full User Details & Academic Dossier Card */}
      <SectionHeader title="Full Profile Details" meta="Academic & workspace identity" />
      <Card style={styles.detailsCard} testID="profile-details-card">
        <View style={styles.detailRow}>
          <View style={styles.detailLabelRow}>
            <IconTile name="person-outline" tone="primary" size={34} />
            <View>
              <Text style={styles.detailLabel}>Full Name</Text>
              <Text style={styles.detailSubLabel}>Display name across workspaces</Text>
            </View>
          </View>
          <Text style={styles.detailValue} numberOfLines={1}>
            {effectiveFullName}
          </Text>
        </View>

        <View style={[styles.detailRow, styles.detailRowBorder]}>
          <View style={styles.detailLabelRow}>
            <IconTile name="mail-outline" tone="primary" size={34} />
            <View>
              <Text style={styles.detailLabel}>Academic Email</Text>
              <Text style={styles.detailSubLabel}>Primary login & notifications</Text>
            </View>
          </View>
          <Text style={styles.detailValue} numberOfLines={1}>
            {user ? effectiveEmail : 'Not signed in'}
          </Text>
        </View>

        <View style={[styles.detailRow, styles.detailRowBorder]}>
          <View style={styles.detailLabelRow}>
            <IconTile name="school-outline" tone="neutral" size={34} />
            <View>
              <Text style={styles.detailLabel}>University</Text>
              <Text style={styles.detailSubLabel}>Educational institution</Text>
            </View>
          </View>
          <Text style={styles.detailValue} numberOfLines={1}>
            {profile?.university ?? localUniversity ?? 'Not specified'}
          </Text>
        </View>

        <View style={[styles.detailRow, styles.detailRowBorder]}>
          <View style={styles.detailLabelRow}>
            <IconTile name="book-outline" tone="neutral" size={34} />
            <View>
              <Text style={styles.detailLabel}>Department</Text>
              <Text style={styles.detailSubLabel}>Faculty, major, or research group</Text>
            </View>
          </View>
          <Text style={styles.detailValue} numberOfLines={1}>
            {profile?.department ?? localDepartment ?? 'General'}
          </Text>
        </View>

        <View style={[styles.detailRow, styles.detailRowBorder]}>
          <View style={styles.detailLabelRow}>
            <IconTile name="camera-outline" tone="success" size={34} />
            <View>
              <Text style={styles.detailLabel}>Profile Picture</Text>
              <Text style={styles.detailSubLabel}>Visible to project teammates</Text>
            </View>
          </View>
          <Badge
            label={effectiveAvatarUrl ? 'Custom Photo' : 'Initials Avatar'}
            variant={effectiveAvatarUrl ? 'success' : 'default'}
            size="sm"
          />
        </View>

        <View style={[styles.detailRow, styles.detailRowBorder]}>
          <View style={styles.detailLabelRow}>
            <IconTile name="id-card-outline" tone="neutral" size={34} />
            <View>
              <Text style={styles.detailLabel}>Student ID & Term</Text>
              <Text style={styles.detailSubLabel}>Joined {memberSinceDate}</Text>
            </View>
          </View>
          <Text style={styles.detailValue} numberOfLines={1}>
            {studentIdCode} • {lastUpdatedDate}
          </Text>
        </View>
      </Card>

      {/* 3. Notification Preferences & Privacy Section */}
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
          <Ionicons
            name="information-circle-outline"
            size={16}
            color={colors.textSecondary}
          />
          <Text style={styles.androidNoticeText}>
            Android OS note: background delivery requires notification permission and may be
            deferred during Doze / battery optimization or when push provider credentials are
            not configured.
          </Text>
        </View>
      </Card>

      {/* 4. Backend Connection Status */}
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
              icon={
                <Ionicons name="checkmark-circle" size={14} color={colors.successText} />
              }
            />
          ) : (
            <Badge
              variant="warning"
              label="Unconfigured (.env.local)"
              icon={
                <Ionicons name="warning-outline" size={14} color={colors.warningText} />
              }
            />
          )}
        </View>
      </Card>

      {/* 5. Session Actions */}
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

      {/* Modal A: Profile Picture Upload Studio */}
      <Modal
        visible={isAvatarModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsAvatarModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet} testID="avatar-upload-modal">
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleCol}>
                <Text style={styles.modalEyebrow}>PROFILE PICTURE UPLOAD</Text>
                <Text style={styles.modalTitle} accessibilityRole="header">
                  Upload or Choose Profile Photo
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close profile picture upload modal"
                onPress={() => setIsAvatarModalOpen(false)}
                style={styles.closeModalBtn}
              >
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Live Circular Photo Preview */}
              <View style={styles.avatarPreviewStage}>
                <Avatar
                  name={effectiveFullName}
                  avatarUrl={avatarDraftUrl.trim() || null}
                  size={96}
                  testID="avatar-upload-preview"
                />
                <Text style={styles.avatarPreviewCaption}>
                  {avatarDraftUrl.trim()
                    ? 'Live Custom Photo Preview'
                    : 'Currently using Initials Avatar'}
                </Text>
              </View>

              {avatarUploadError ? (
                <View style={styles.errorAlertBox}>
                  <Ionicons name="alert-circle" size={16} color={colors.dangerText} />
                  <Text style={styles.errorAlertText}>{avatarUploadError}</Text>
                </View>
              ) : null}

              {/* Native Device Photo Library & Camera Actions */}
              <View style={styles.nativePickRow}>
                <Button
                  testID="pick-gallery-button"
                  title="Photo Library"
                  variant="soft"
                  size="md"
                  style={styles.nativePickBtn}
                  leftIcon={<Ionicons name="images-outline" size={18} color={colors.primaryDark} />}
                  onPress={handlePickFromLibrary}
                />
                <Button
                  testID="take-photo-button"
                  title="Take Photo"
                  variant="soft"
                  size="md"
                  style={styles.nativePickBtn}
                  leftIcon={<Ionicons name="camera-outline" size={18} color={colors.primaryDark} />}
                  onPress={handleTakePhoto}
                />
              </View>

              {avatarDraftUrl.startsWith('data:image/') ||
              avatarDraftUrl.startsWith('file://') ||
              avatarDraftUrl.startsWith('content://') ? (
                <View style={styles.pickedFileNotice}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.brandMint} />
                  <Text style={styles.pickedFileNameText} numberOfLines={1}>
                    Device photo chosen and ready to save
                  </Text>
                  <Pressable
                    hitSlop={8}
                    onPress={() => setAvatarDraftUrl('')}
                    accessibilityRole="button"
                    accessibilityLabel="Remove selected device photo"
                  >
                    <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                  </Pressable>
                </View>
              ) : null}

              {/* Upload via Photo URL */}
              <Input
                testID="avatar-url-input"
                label="Or Enter Photo URL (https://)"
                placeholder="https://example.edu/photos/student-avatar.jpg"
                value={
                  avatarDraftUrl.startsWith('data:image/') ||
                  avatarDraftUrl.startsWith('file://') ||
                  avatarDraftUrl.startsWith('content://')
                    ? ''
                    : avatarDraftUrl
                }
                onChangeText={(val) => {
                  setAvatarDraftUrl(val);
                  setAvatarUploadError(null);
                }}
                autoCapitalize="none"
                keyboardType="url"
              />

              {/* Instant Academic Portrait Presets */}
              <Text style={styles.presetSectionTitle}>
                OR SELECT A STUDIO PORTRAIT PRESET
              </Text>
              <View style={styles.presetGrid}>
                {AVATAR_PHOTO_PRESETS.map((preset) => {
                  const isSelected = avatarDraftUrl.trim() === preset.url;
                  return (
                    <Pressable
                      key={preset.id}
                      testID={`avatar-preset-${preset.id}`}
                      accessibilityRole="button"
                      accessibilityLabel={`Select ${preset.label} profile photo`}
                      onPress={() => {
                        setAvatarDraftUrl(preset.url);
                        setAvatarUploadError(null);
                      }}
                      style={[
                        styles.presetCard,
                        isSelected && styles.presetCardSelected,
                      ]}
                    >
                      <Avatar name={preset.label} avatarUrl={preset.url} size={44} />
                      <View style={styles.presetTextCol}>
                        <Text style={styles.presetLabel} numberOfLines={1}>
                          {preset.label}
                        </Text>
                        <Text style={styles.presetSub} numberOfLines={1}>
                          {preset.subtitle}
                        </Text>
                      </View>
                      {isSelected ? (
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color={colors.primary}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.modalActionsCol}>
                <Button
                  testID="save-avatar-button"
                  title="Save Profile Picture"
                  variant="primary"
                  size="md"
                  loading={isUploadingAvatar}
                  onPress={() => handleSaveAvatarPhoto()}
                />
                {effectiveAvatarUrl || avatarDraftUrl.trim() ? (
                  <Button
                    testID="remove-avatar-button"
                    title="Reset to Initials Avatar"
                    variant="outline"
                    size="sm"
                    onPress={() => handleSaveAvatarPhoto(null)}
                  />
                ) : null}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal B: Edit Full Profile Details */}
      <Modal
        visible={isEditModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsEditModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet} testID="edit-profile-modal">
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleCol}>
                <Text style={styles.modalEyebrow}>STUDENT DOSSIER</Text>
                <Text style={styles.modalTitle} accessibilityRole="header">
                  Edit Full Profile Details
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close edit profile modal"
                onPress={() => setIsEditModalOpen(false)}
                style={styles.closeModalBtn}
              >
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              {editError ? (
                <View style={styles.errorAlertBox}>
                  <Ionicons name="alert-circle" size={16} color={colors.dangerText} />
                  <Text style={styles.errorAlertText}>{editError}</Text>
                </View>
              ) : null}

              <Input
                testID="edit-profile-fullname-input"
                label="Full Name"
                placeholder="e.g. Alex Rivera"
                value={editNameInput}
                onChangeText={setEditNameInput}
              />

              <Input
                testID="edit-profile-university-input"
                label="University / Institution"
                placeholder="e.g. Stanford University"
                value={editUniversityInput}
                onChangeText={setEditUniversityInput}
              />

              <Input
                testID="edit-profile-department-input"
                label="Department / Major"
                placeholder="e.g. Computer Science & AI"
                value={editDepartmentInput}
                onChangeText={setEditDepartmentInput}
              />

              <Input
                testID="edit-profile-avatar-input"
                label="Profile Picture URL (optional)"
                placeholder="https://..."
                value={editAvatarInput}
                onChangeText={setEditAvatarInput}
                autoCapitalize="none"
                keyboardType="url"
              />

              <View style={styles.modalActionsCol}>
                <Button
                  testID="save-profile-details-button"
                  title="Save Profile Details"
                  variant="primary"
                  size="md"
                  loading={isSavingProfile}
                  onPress={handleSaveProfileDetails}
                />
                <Button
                  title="Cancel"
                  variant="secondary"
                  size="sm"
                  onPress={() => setIsEditModalOpen(false)}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    marginBottom: spacing.lg,
    gap: spacing.md,
    overflow: 'hidden',
  },
  heroAccentBar: {
    height: 4,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    marginBottom: -spacing.xs,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryBorder,
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  verifiedDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.brandMint,
  },
  verifiedPillText: {
    ...typography.overline,
    color: colors.primary,
    fontSize: 10,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarContainer: {
    position: 'relative',
    width: 80,
    height: 80,
  },
  cameraOverlayBtn: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.subtle,
  },
  avatarInfo: {
    flex: 1,
    gap: 2,
  },
  userName: {
    ...typography.titleMedium,
    color: colors.textPrimary,
  },
  userEmail: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  userAcademicSub: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  heroActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  heroActionBtn: {
    flex: 1,
  },
  kpiStrip: {
    flexDirection: 'row',
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm,
  },
  kpiTile: {
    flex: 1,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xxs,
    alignItems: 'center',
  },
  kpiValue: {
    ...typography.titleSmall,
    color: colors.textPrimary,
    fontWeight: '800',
  },
  kpiLabel: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 1,
  },
  detailsCard: {
    marginBottom: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  detailRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  detailLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  detailLabel: {
    ...typography.label,
    color: colors.textPrimary,
  },
  detailSubLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  detailValue: {
    ...typography.label,
    color: colors.textSecondary,
    maxWidth: '46%',
    textAlign: 'right',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '88%',
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    paddingTop: spacing.base,
    ...shadows.raised,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  modalTitleCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  modalEyebrow: {
    ...typography.overline,
    color: colors.primary,
    marginBottom: 2,
  },
  modalTitle: {
    ...typography.titleMedium,
    color: colors.textPrimary,
  },
  closeModalBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    padding: spacing.base,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  avatarPreviewStage: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  avatarPreviewCaption: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  errorAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.dangerBg,
    borderColor: colors.dangerBorder,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.sm,
  },
  errorAlertText: {
    ...typography.caption,
    color: colors.dangerText,
    flex: 1,
  },
  nativePickRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  nativePickBtn: {
    flex: 1,
  },
  pickedFileNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
  },
  pickedFileNameText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
    flex: 1,
  },
  presetSectionTitle: {
    ...typography.overline,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  presetGrid: {
    gap: spacing.xs,
  },
  presetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  presetCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  presetTextCol: {
    flex: 1,
  },
  presetLabel: {
    ...typography.label,
    color: colors.textPrimary,
  },
  presetSub: {
    ...typography.caption,
    color: colors.textMuted,
  },
  modalActionsCol: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
