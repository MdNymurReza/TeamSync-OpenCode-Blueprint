import { Redirect, Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, typography } from '@/theme';
import { useAuth } from '@/features/auth';
import { LoadingView } from '@/components/ui';

export default function TabLayout() {
  const { session, isLoading, isConfigured } = useAuth();

  if (isLoading) {
    return <LoadingView message="Restoring session..." />;
  }

  if (isConfigured && !session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTitleStyle: {
          ...typography.titleSmall,
          color: colors.textPrimary,
        },
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerTitle: 'MelBond Workspace',
          tabBarAccessibilityLabel: 'Home tab',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={22}
              color={typeof color === 'string' ? color : colors.textMuted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: 'Projects',
          headerTitle: 'Projects',
          tabBarAccessibilityLabel: 'Projects tab',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'folder' : 'folder-outline'}
              size={22}
              color={typeof color === 'string' ? color : colors.textMuted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          headerTitle: 'Activity & Updates',
          tabBarAccessibilityLabel: 'Activity tab',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'notifications' : 'notifications-outline'}
              size={22}
              color={typeof color === 'string' ? color : colors.textMuted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerTitle: 'Profile & Settings',
          tabBarAccessibilityLabel: 'Profile tab',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={22}
              color={typeof color === 'string' ? color : colors.textMuted}
            />
          ),
        }}
      />
    </Tabs>
  );
}
