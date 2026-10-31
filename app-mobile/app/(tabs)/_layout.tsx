import { Redirect, Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme';
import { useAuth } from '@/features/auth';
import { LoadingView } from '@/components/ui';

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(active: IconName, inactive: IconName) {
  function TabBarIcon({ color, focused }: { color: unknown; focused: boolean }) {
    return (
      <Ionicons
        name={focused ? active : inactive}
        size={24}
        color={typeof color === 'string' ? color : colors.textMuted}
      />
    );
  }
  return TabBarIcon;
}

export default function TabLayout() {
  const { session, isLoading, isConfigured } = useAuth();
  const insets = useSafeAreaInsets();

  if (isLoading) {
    return <LoadingView message="Restoring session..." />;
  }

  if (isConfigured && !session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Tabs
      screenOptions={{
        // Tab screens render their own large in-content titles.
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarAccessibilityLabel: 'Home tab',
          tabBarIcon: tabIcon('home', 'home-outline'),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: 'Projects',
          tabBarAccessibilityLabel: 'Projects tab',
          tabBarIcon: tabIcon('folder', 'folder-outline'),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarAccessibilityLabel: 'Activity tab',
          tabBarIcon: tabIcon('notifications', 'notifications-outline'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarAccessibilityLabel: 'Profile tab',
          tabBarIcon: tabIcon('person-circle', 'person-circle-outline'),
        }}
      />
    </Tabs>
  );
}
