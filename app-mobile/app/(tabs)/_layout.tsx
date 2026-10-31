import { Redirect, Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii, shadows } from '@/theme';
import { useAuth } from '@/features/auth';
import { LoadingView } from '@/components/ui';

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(active: IconName, inactive: IconName) {
  function TabBarIcon({ color, focused }: { color: unknown; focused: boolean }) {
    return (
      <View style={[styles.iconPill, focused && styles.iconPillActive]}>
        <Ionicons
          name={focused ? active : inactive}
          size={22}
          color={typeof color === 'string' ? color : colors.textMuted}
        />
      </View>
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

  const bottomInset = Math.max(insets.bottom, 10);

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
          height: 68 + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: 6,
          ...shadows.card,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
          justifyContent: 'center',
        },
        tabBarIconStyle: {
          width: 48,
          height: 28,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          lineHeight: 15,
          fontWeight: '700',
          letterSpacing: 0.2,
          marginTop: 2,
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

const styles = StyleSheet.create({
  iconPill: {
    width: 44,
    height: 26,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPillActive: {
    backgroundColor: colors.primaryLight,
  },
});
