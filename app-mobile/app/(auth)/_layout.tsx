import { Redirect, Stack } from 'expo-router';
import { colors, typography } from '@/theme';
import { useAuth } from '@/features/auth';

export default function AuthLayout() {
  const { session } = useAuth();

  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack
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
        headerTintColor: colors.primary,
        contentStyle: {
          backgroundColor: colors.background,
        },
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
