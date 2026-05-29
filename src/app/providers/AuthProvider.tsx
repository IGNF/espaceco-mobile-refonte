import { useState, useCallback, useEffect, type ReactNode } from "react";
import { Network } from '@ign/mobile-device';
import { AuthContext } from "./AuthContext";
import * as authService from "@/infra/auth";
import type { AppUser } from "@/domain/user/models";
import { UserStorageAdapter } from "@/infra/storage/UserStorageAdapter";
import { isAppError, toAppError } from '@/shared/errors/appError';
import { clearSessionSentReports } from '@/features/report/state/sessionSentReportsStore';

const userStorage = new UserStorageAdapter();

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Provides authentication state and actions to the app.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Try to restore session on app start
  useEffect(() => {
    async function tryRestoreSession() {
      try {
        const storedUser = await userStorage.getUser() as AppUser | null;
        if (storedUser?.isAnonymous) {
          setUser(storedUser);
        } else if (storedUser) {
          // Re-hydrate tokens into collabApiClient from storage
          const sessionRestored = await authService.restoreSession();

          if (sessionRestored) {
            // Refresh user data from API
            const result = await authService.getCurrentUser();
            if (result.success && result.user) {
              await userStorage.saveUser(result.user);
              setUser(result.user);
            } else if (isAppError(result.error) && result.error.kind === 'network') {
              // When the app starts fully offline, keep the cached identity so offline mode remains usable.
              setUser(storedUser);
            } else {
              await userStorage.clearUser();
            }
          } else {
            const networkStatus = await Network.getStatus().catch(() => ({ connected: true }));
            if (networkStatus.connected) {
              await userStorage.clearUser();
            } else {
              setUser(storedUser);
            }
          }
        }
      } catch {
        await userStorage.clearUser();
      } finally {
        setIsLoading(false);
      }
    }

    tryRestoreSession();
  }, []);

  const loginWithPassword = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await authService.loginWithPassword(email, password);
      if (result.success && result.user) {
        clearSessionSentReports();
        await userStorage.saveUser(result.user);
        setUser(result.user);
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithOAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await authService.loginWithOAuth();
      if (result.success && result.user) {
        clearSessionSentReports();
        await userStorage.saveUser(result.user);
        setUser(result.user);
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setUserFromOAuthCallback = useCallback(async (user: AppUser) => {
    clearSessionSentReports();
    await userStorage.saveUser(user);
    setUser(user);
  }, []);

  const refreshCurrentUser = useCallback(async () => {
    if (!user || user.isAnonymous) {
      return null;
    }

    const result = await authService.getCurrentUser();
    if (result.success && result.user) {
      await userStorage.saveUser(result.user);
      setUser(result.user);
      return result.user;
    }

    return null;
  }, [user]);

  const continueWithoutAccount = useCallback(async () => {
    setIsLoading(true);
    try {
      const anonymousUser: AppUser = {
        id: 0,
        email: "",
        firstName: "",
        lastName: "",
        username: "anonymous",
        isAnonymous: true,
        communities: [],
      };
      await userStorage.saveUser(anonymousUser);
      setUser(anonymousUser);
      return { success: true, user: anonymousUser };
    } catch (error) {
      return {
        success: false,
        user: null,
        error: toAppError(error, {
          fallbackKind: 'unknown',
          fallbackTranslationKey: 'errors.auth.continueWithoutAccountFailed',
        }),
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authService.logout();
    } finally {
      await userStorage.clearAll();
      clearSessionSentReports();
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        loginWithPassword,
        loginWithOAuth,
        setUserFromOAuthCallback,
        refreshCurrentUser,
        logout,
        continueWithoutAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
