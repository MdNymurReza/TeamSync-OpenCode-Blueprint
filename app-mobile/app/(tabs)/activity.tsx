import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorView,
  IconTile,
  Input,
  LoadingView,
  ScreenHeader,
  SectionHeader,
  TabScreen,
} from '@/components/ui';
import { useAuth } from '@/features/auth';
import {
  ActivityEventWithDetails,
  NotificationDeliveryWithProject,
  notificationsService,
} from '@/features/notifications';
import {
  SEARCH_SCOPE_OPTIONS,
  SearchResultItem,
  SearchScope,
  searchService,
} from '@/features/search';
import { colors, radii, spacing, touchTargets, typography } from '@/theme';

function getActivityIcon(entityType: string): keyof typeof Ionicons.glyphMap {
  switch (entityType) {
    case 'task':
      return 'checkbox-outline';
    case 'milestone':
      return 'flag-outline';
    case 'meeting':
      return 'people-outline';
    case 'decision':
      return 'git-pull-request-outline';
    case 'resource':
      return 'folder-open-outline';
    case 'pulse':
      return 'heart-half-outline';
    default:
      return 'notifications-outline';
  }
}

export default function ActivityScreen() {
  const router = useRouter();
  const { user, isConfigured } = useAuth();

  const [activityEvents, setActivityEvents] = useState<ActivityEventWithDetails[]>([]);
  const [notifications, setNotifications] = useState<NotificationDeliveryWithProject[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(
    Boolean(isConfigured && user && notificationsService?.fetchActivityStream)
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Authorized Workspace Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState<SearchScope>('all');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const loadFeed = useCallback(async () => {
    if (!isConfigured || !user || !notificationsService?.fetchActivityStream) {
      setActivityEvents([]);
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    setErrorMessage(null);
    const [actRes, notifRes] = await Promise.all([
      notificationsService.fetchActivityStream(),
      notificationsService.fetchUserNotifications(),
    ]);

    if (actRes.error) {
      setErrorMessage(actRes.error.message);
    } else {
      setActivityEvents(actRes.data ?? []);
    }

    if (notifRes.data) {
      setNotifications(notifRes.data);
    }

    setIsLoading(false);
  }, [isConfigured, user]);

  useEffect(() => {
    if (!isConfigured || !user || !notificationsService?.fetchActivityStream) {
      return;
    }

    let isMounted = true;
    (async () => {
      const [actRes, notifRes] = await Promise.all([
        notificationsService.fetchActivityStream(),
        notificationsService.fetchUserNotifications(),
      ]);
      if (!isMounted) return;
      if (actRes.error) {
        setErrorMessage(actRes.error.message);
      } else {
        setActivityEvents(actRes.data ?? []);
      }
      if (notifRes.data) {
        setNotifications(notifRes.data);
      }
      setIsLoading(false);
    })();

    return () => {
      isMounted = false;
    };
  }, [isConfigured, user]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadFeed();
    setIsRefreshing(false);
  };

  const handleRunSearch = async (overrideScope?: SearchScope) => {
    const activeScope = overrideScope ?? searchScope;
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    const { data, error } = await searchService.searchAuthorizedWorkspaceContent(
      trimmed,
      activeScope
    );
    setIsSearching(false);

    if (error) {
      setErrorMessage(error.message);
    } else {
      setSearchResults(data ?? []);
    }
  };

  const handleMarkRead = async (notificationId: string) => {
    await notificationsService.markNotificationRead(notificationId);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    );
  };

  if (isLoading && !isRefreshing) {
    return <LoadingView message="Loading activity & search..." />;
  }

  const unreadNotifications = notifications.filter((n) => !n.is_read);

  return (
    <TabScreen
      refreshing={isRefreshing}
      onRefresh={isConfigured && user ? handleRefresh : undefined}
    >
      <ScreenHeader
        eyebrow="Updates & Search"
        title="Activity & Updates"
        subtitle="Recent team actions, milestone changes, and authorized workspace search."
      />

      {errorMessage ? (
        <ErrorView
          title="Could not sync activity"
          message={errorMessage}
          onRetry={loadFeed}
          style={styles.errorBanner}
        />
      ) : null}

      {/* Authorized Workspace Search Card */}
      <Card style={styles.searchCard} variant="elevated">
        <Input
          label="Authorized Workspace Search"
          placeholder="Search tasks, milestones, decisions, resources..."
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            if (!text.trim()) {
              setHasSearched(false);
              setSearchResults([]);
            }
          }}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scopeRow}
        >
          {SEARCH_SCOPE_OPTIONS.map((opt) => {
            const isSelected = searchScope === opt.scope;
            return (
              <Pressable
                key={opt.scope}
                hitSlop={6}
                style={[styles.scopeChip, isSelected && styles.scopeChipActive]}
                onPress={() => {
                  setSearchScope(opt.scope);
                  if (searchQuery.trim()) {
                    handleRunSearch(opt.scope);
                  }
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Filter search by ${opt.label}`}
              >
                <Text
                  style={[
                    styles.scopeChipText,
                    isSelected && styles.scopeChipTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Button
          title="Search Workspaces"
          variant="primary"
          size="sm"
          loading={isSearching}
          leftIcon={<Ionicons name="search-outline" size={16} color={colors.surface} />}
          onPress={() => handleRunSearch()}
          accessibilityLabel="Search authorized workspaces"
        />

        {hasSearched ? (
          <View style={styles.searchResultsBox}>
            <Text style={styles.searchResultsMeta}>
              {searchResults.length === 0
                ? 'No matching records found in your authorized workspaces.'
                : `${searchResults.length} authorized match${
                    searchResults.length === 1 ? '' : 'es'
                  }`}
            </Text>
            {searchResults.map((item, idx) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`Open search result ${item.title}`}
                onPress={() => router.push(item.route as Href)}
                style={({ pressed }) => [
                  styles.itemRow,
                  idx > 0 && styles.itemDivider,
                  pressed && styles.itemRowPressed,
                ]}
              >
                <IconTile
                  name={getActivityIcon(item.entityType)}
                  tone="primary"
                  size={34}
                />
                <View style={styles.itemTextCol}>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.itemSubtitle} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                </View>
                <Badge label={item.badgeLabel} variant="info" size="sm" />
              </Pressable>
            ))}
          </View>
        ) : null}
      </Card>

      {/* Unread Notifications Section */}
      {unreadNotifications.length > 0 ? (
        <>
          <SectionHeader
            title="Unread Reminders & Alerts"
            meta={`${unreadNotifications.length} unread`}
          />
          <Card style={styles.listCard}>
            {unreadNotifications.map((notif, idx) => (
              <View
                key={notif.id}
                style={[styles.itemRow, idx > 0 && styles.itemDivider]}
              >
                <IconTile name="notifications-outline" tone="primary" size={36} />
                <View style={styles.itemTextCol}>
                  <Text style={styles.itemTitle}>{notif.title}</Text>
                  <Text style={styles.itemSubtitle}>{notif.body}</Text>
                </View>
                <Button
                  title="Mark Read"
                  variant="soft"
                  size="sm"
                  onPress={() => handleMarkRead(notif.id)}
                  accessibilityLabel={`Mark notification ${notif.title} as read`}
                />
              </View>
            ))}
          </Card>
        </>
      ) : null}

      {/* Chronological Activity Stream */}
      <SectionHeader
        title="Chronological Activity"
        meta={
          activityEvents.length > 0 ? `${activityEvents.length} events` : undefined
        }
      />
      {activityEvents.length === 0 ? (
        <Card style={styles.card}>
          <EmptyState
            title="No recent activity"
            description="Updates from your team will appear here in chronological order once you join an active project. Private project boundaries are strictly preserved."
            icon={
              <Ionicons name="notifications-outline" size={38} color={colors.primary} />
            }
          />
        </Card>
      ) : (
        <Card style={styles.listCard}>
          {activityEvents.map((ev, idx) => (
            <Pressable
              key={ev.id}
              accessibilityRole="button"
              accessibilityLabel={`Open workspace ${ev.projectName ?? 'Workspace'}`}
              onPress={() => router.push(`/projects/${ev.project_id}` as Href)}
              style={({ pressed }) => [
                styles.itemRow,
                idx > 0 && styles.itemDivider,
                pressed && styles.itemRowPressed,
              ]}
            >
              <IconTile
                name={getActivityIcon(ev.entity_type)}
                tone="primary"
                size={36}
              />
              <View style={styles.itemTextCol}>
                <Text style={styles.itemTitle}>{ev.summary_text}</Text>
                <Text style={styles.itemSubtitle}>
                  {ev.projectName ?? 'Workspace'}
                  {ev.actor?.full_name ? ` • ${ev.actor.full_name}` : ''} •{' '}
                  {new Date(ev.created_at).toLocaleDateString()}
                </Text>
              </View>
            </Pressable>
          ))}
        </Card>
      )}
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  errorBanner: {
    marginBottom: spacing.base,
  },
  searchCard: {
    padding: spacing.base,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  scopeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  scopeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scopeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  scopeChipText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  scopeChipTextActive: {
    color: colors.surface,
  },
  searchResultsBox: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  searchResultsMeta: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  card: {
    paddingVertical: spacing.xs,
  },
  listCard: {
    padding: spacing.xs,
    marginBottom: spacing.lg,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    minHeight: touchTargets.minTouchSize,
    gap: spacing.sm,
  },
  itemRowPressed: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.md,
  },
  itemDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  itemTextCol: {
    flex: 1,
  },
  itemTitle: {
    ...typography.label,
    color: colors.textPrimary,
  },
  itemSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
});
