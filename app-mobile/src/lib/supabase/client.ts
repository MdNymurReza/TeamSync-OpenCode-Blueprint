import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import { Database } from '@/types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl.trim().length > 0 &&
  supabaseAnonKey.trim().length > 0 &&
  !supabaseUrl.includes('placeholder')
);

// Fallback dummy URL/key if environment variables have not been configured yet
// This prevents the mobile app from crashing on start while waiting for Supabase credentials.
const resolvedUrl = isSupabaseConfigured ? supabaseUrl : 'https://unconfigured-melbond.supabase.co';
const resolvedAnonKey = isSupabaseConfigured ? supabaseAnonKey : 'unconfigured-anon-key';

export const supabase = createClient<Database>(resolvedUrl, resolvedAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
