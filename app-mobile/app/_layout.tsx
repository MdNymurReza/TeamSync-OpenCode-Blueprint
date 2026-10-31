import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';

import { AnimatedSplashOverlay, ToastProvider } from '@/components/ui';
import { AuthProvider, useAuth } from '@/features/auth';
import { colors, stackScreenOptions } from '@/theme';

function RootNavigator() {
  const { isLoading } = useAuth();

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ ...stackScreenOptions, headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen
          name="projects/new"
          options={{ title: 'New Workspace', headerShown: true }}
        />
        <Stack.Screen
          name="projects/join"
          options={{ title: 'Join Workspace', headerShown: true }}
        />
        <Stack.Screen
          name="projects/[id]/index"
          options={{ title: 'Overview', headerShown: true }}
        />
        <Stack.Screen
          name="projects/[id]/members"
          options={{ title: 'Team', headerShown: true }}
        />
        <Stack.Screen
          name="projects/[id]/phases"
          options={{ title: 'Phases', headerShown: true }}
        />
        <Stack.Screen
          name="projects/[id]/milestones"
          options={{ title: 'Timeline & Milestones', headerShown: true }}
        />
        <Stack.Screen
          name="projects/[id]/timeline"
          options={{ title: 'Visual Timeline & Calendar', headerShown: true }}
        />
        <Stack.Screen
          name="projects/[id]/meetings/index"
          options={{ title: 'Meetings & Minutes', headerShown: true }}
        />
        <Stack.Screen
          name="projects/[id]/decisions"
          options={{ title: 'Decision Log', headerShown: true }}
        />
        <Stack.Screen
          name="projects/[id]/resources"
          options={{ title: 'Resource Hub', headerShown: true }}
        />
        <Stack.Screen
          name="projects/[id]/pulse"
          options={{ title: 'Team Pulse', headerShown: true }}
        />
        <Stack.Screen
          name="projects/[id]/tasks/index"
          options={{ title: 'Tasks', headerShown: true }}
        />
        <Stack.Screen
          name="projects/[id]/tasks/new"
          options={{ title: 'New Task', headerShown: true }}
        />
        <Stack.Screen
          name="projects/[id]/tasks/[taskId]"
          options={{ title: 'Task', headerShown: true }}
        />
        <Stack.Screen name="+not-found" options={{ title: 'Not Found', headerShown: false }} />
      </Stack>

      <AnimatedSplashOverlay isAppReady={!isLoading} />
    </View>
  );
}

/**
 * Root Layout for MelBond.
 * Wraps the app in AuthProvider and hosts global navigation stacks + animated splash screen.
 */
export default function RootLayout() {
  return (
    <ToastProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </ToastProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
