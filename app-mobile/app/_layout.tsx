import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider } from '@/features/auth';
import { stackScreenOptions } from '@/theme';

/**
 * Root Layout for MelBond.
 * Wraps the app in AuthProvider and hosts global navigation stacks.
 * Pushed screens share `stackScreenOptions` for a consistent header treatment.
 */
export default function RootLayout() {
  return (
    <AuthProvider>
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
    </AuthProvider>
  );
}
