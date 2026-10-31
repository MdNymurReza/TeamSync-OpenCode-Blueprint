import React from 'react';
import { Redirect } from 'expo-router';

import { LoadingView } from '@/components/ui';
import { useAuth } from '@/features/auth';

/**
 * Root Index route.
 * Entry point for MelBond root URL (/).
 * Redirects dynamically based on session status:
 * - While checking session: displays accessible LoadingView
 * - If Supabase configured and unauthenticated: routes to /(auth)/sign-in
 * - Otherwise: routes to /(tabs)
 */
export default function RootIndex() {
  const { session, isLoading, isConfigured } = useAuth();

  if (isLoading) {
    return <LoadingView message="Restoring session..." />;
  }

  if (isConfigured && !session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return <Redirect href="/(tabs)" />;
}
