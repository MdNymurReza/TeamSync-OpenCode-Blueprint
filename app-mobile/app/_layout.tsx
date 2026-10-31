import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider } from '@/features/auth';

/**
 * Root Layout for MelBond.
 * Wraps the app in AuthProvider and hosts global navigation stacks.
 */
export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen
          name="projects/new"
          options={{
            title: 'Create Workspace',
            headerShown: true,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="projects/join"
          options={{
            title: 'Join Workspace',
            headerShown: true,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="projects/[id]/index"
          options={{
            title: 'Workspace',
            headerShown: true,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="projects/[id]/members"
          options={{
            title: 'Workspace Team',
            headerShown: true,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="projects/[id]/phases"
          options={{
            title: 'Workflow & Phases',
            headerShown: true,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="projects/[id]/tasks/index"
          options={{
            title: 'Workspace Tasks',
            headerShown: true,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="projects/[id]/tasks/new"
          options={{
            title: 'Create Task',
            headerShown: true,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="projects/[id]/tasks/[taskId]"
          options={{
            title: 'Task Details',
            headerShown: true,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen name="+not-found" options={{ title: 'Not Found', headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}
