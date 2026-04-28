import { createContext } from 'react';
import type { AppUser, DisplayMode } from '@/domain/user/models';
import type { AuthResult } from '@/domain/auth/models';

export interface AuthContextType {
  user: AppUser | null;
  displayMode: DisplayMode;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithPassword: (email: string, password: string) => Promise<{ success: boolean; user: AppUser | null; error?: Error | null }>;
  loginWithOAuth: () => Promise<AuthResult>;
  setUserFromOAuthCallback: (user: AppUser) => Promise<void>;
  refreshCurrentUser: () => Promise<AppUser | null>;
  continueWithoutAccount: () => Promise<{ success: boolean; user: AppUser | null; error?: Error | null }>;
  setDisplayMode: (displayMode: DisplayMode) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);
