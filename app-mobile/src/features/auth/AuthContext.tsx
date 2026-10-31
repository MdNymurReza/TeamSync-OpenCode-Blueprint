import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Session, User } from '@supabase/supabase-js';

import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';
import { Profile, ProfileUpdate } from '@/types/database';
import { AuthContextValue, SignUpParams, UpdateProfileParams } from './types';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(isSupabaseConfigured);

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    if (!isSupabaseConfigured) {
      return null;
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Failed to load profile:', error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.warn('Error fetching profile:', err);
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      const updated = await fetchProfile(user.id);
      setProfile(updated);
    }
  }, [fetchProfile, user]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    let isMounted = true;

    // 1. Initial session check
    supabase.auth
      .getSession()
      .then(async ({ data: { session: initialSession }, error }) => {
        if (!isMounted) return;
        if (error) {
          console.warn('Failed to get session:', error.message);
        }
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        if (initialSession?.user) {
          const userProfile = await fetchProfile(initialSession.user.id);
          if (isMounted) setProfile(userProfile);
        }
        if (isMounted) setIsLoading(false);
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('Session restoration error:', err);
          setIsLoading(false);
        }
      });

    // 2. Auth state subscription
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        const userProfile = await fetchProfile(newSession.user.id);
        if (isMounted) setProfile(userProfile);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error: Error | null }> => {
      if (!isSupabaseConfigured) {
        return {
          error: new Error(
            'Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env.local.'
          ),
        };
      }
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          return { error };
        }
        return { error: null };
      } catch (err) {
        return { error: err instanceof Error ? err : new Error('Sign in failed') };
      }
    },
    []
  );

  const signUp = useCallback(
    async ({
      email,
      password,
      fullName,
      university,
      department,
    }: SignUpParams): Promise<{ error: Error | null }> => {
      if (!isSupabaseConfigured) {
        return {
          error: new Error(
            'Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env.local.'
          ),
        };
      }
      try {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              university: university?.trim() || null,
              department: department?.trim() || null,
            },
          },
        });
        if (error) {
          return { error };
        }
        return { error: null };
      } catch (err) {
        return { error: err instanceof Error ? err : new Error('Sign up failed') };
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } finally {
      setSession(null);
      setUser(null);
      setProfile(null);
    }
  }, []);

  const resetPassword = useCallback(
    async (email: string): Promise<{ error: Error | null }> => {
      if (!isSupabaseConfigured) {
        return {
          error: new Error(
            'Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env.local.'
          ),
        };
      }
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
        if (error) {
          return { error };
        }
        return { error: null };
      } catch (err) {
        return {
          error: err instanceof Error ? err : new Error('Password reset failed'),
        };
      }
    },
    []
  );

  const updateProfile = useCallback(
    async (
      params: UpdateProfileParams
    ): Promise<{ data: Profile | null; error: Error | null }> => {
      const cleanedName = params.fullName !== undefined ? params.fullName.trim() : undefined;
      if (cleanedName !== undefined && !cleanedName) {
        return { data: null, error: new Error('Full name is required.') };
      }

      const cleanedAvatar =
        params.avatarUrl !== undefined ? params.avatarUrl?.trim() || null : undefined;
      if (
        cleanedAvatar &&
        !cleanedAvatar.startsWith('https://') &&
        !cleanedAvatar.startsWith('http://') &&
        !cleanedAvatar.startsWith('data:image/')
      ) {
        return {
          data: null,
          error: new Error(
            'Profile picture URL must use https://, http://, or a valid image preset.'
          ),
        };
      }

      const nowIso = new Date().toISOString();
      const fallbackNextProfile: Profile = {
        id: profile?.id ?? user?.id ?? 'local-preview-user',
        email: profile?.email ?? user?.email ?? 'student@university.edu',
        full_name: cleanedName ?? profile?.full_name ?? 'Student Member',
        avatar_url:
          cleanedAvatar !== undefined ? cleanedAvatar : (profile?.avatar_url ?? null),
        university:
          params.university !== undefined
            ? params.university?.trim() || null
            : (profile?.university ?? null),
        department:
          params.department !== undefined
            ? params.department?.trim() || null
            : (profile?.department ?? null),
        created_at: profile?.created_at ?? nowIso,
        updated_at: nowIso,
      };

      if (!isSupabaseConfigured || !user?.id) {
        setProfile(fallbackNextProfile);
        return { data: fallbackNextProfile, error: null };
      }

      try {
        const updates: ProfileUpdate = {
          updated_at: nowIso,
        };
        if (cleanedName !== undefined) updates.full_name = cleanedName;
        if (params.university !== undefined) {
          updates.university = params.university?.trim() || null;
        }
        if (params.department !== undefined) {
          updates.department = params.department?.trim() || null;
        }
        if (cleanedAvatar !== undefined) {
          updates.avatar_url = cleanedAvatar;
        }

        const { data, error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user.id)
          .select('*')
          .single();

        if (error) {
          return { data: null, error: new Error(error.message) };
        }

        const updatedRow = (data as Profile) ?? fallbackNextProfile;
        setProfile(updatedRow);
        return { data: updatedRow, error: null };
      } catch (err) {
        return {
          data: null,
          error: err instanceof Error ? err : new Error('Failed to update profile'),
        };
      }
    },
    [profile, user]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      profile,
      isLoading,
      isConfigured: isSupabaseConfigured,
      signIn,
      signUp,
      signOut,
      resetPassword,
      refreshProfile,
      updateProfile,
    }),
    [
      session,
      user,
      profile,
      isLoading,
      signIn,
      signUp,
      signOut,
      resetPassword,
      refreshProfile,
      updateProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
