import { createContext } from 'react';
import type { AppUser } from '@/domain/user/models';

export interface AuthContextType {
  user: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithPassword: (email: string, password: string) => Promise<{ success: boolean; user: AppUser | null; error?: Error | null }>;
  loginWithOAuth: () => Promise<{ success: boolean; user: AppUser | null; error?: Error | null }>;
  continueWithoutAccount: () => Promise<{ success: boolean; user: AppUser | null; error?: Error | null }>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);
