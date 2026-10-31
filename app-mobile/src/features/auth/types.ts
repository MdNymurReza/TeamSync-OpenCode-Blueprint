import { Session, User } from '@supabase/supabase-js';

import { Profile } from '@/types/database';

export interface SignUpParams {
  email: string;
  password: string;
  fullName: string;
  university?: string;
  department?: string;
}

export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (params: SignUpParams) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}
