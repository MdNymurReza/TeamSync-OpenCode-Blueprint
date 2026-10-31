import { Redirect, Stack } from 'expo-router';
import { stackScreenOptions } from '@/theme';
import { useAuth } from '@/features/auth';

export default function AuthLayout() {
  const { session } = useAuth();

  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        ...stackScreenOptions,
        headerShown: true,
      }}
    >
      <Stack.Screen
        name="sign-in"
        options={{
          title: 'Sign In',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="sign-up"
        options={{
          title: 'Create Account',
          headerBackTitle: 'Sign In',
        }}
      />
      <Stack.Screen
        name="reset-password"
        options={{
          title: 'Reset Password',
          headerBackTitle: 'Back',
        }}
      />
    </Stack>
  );
}
