import { useState, useCallback, useEffect, type ReactNode } from "react";
import { Storage } from "@ign/mobile-device";
import { AuthContext } from "./AuthContext";
import * as authService from "@/infra/auth";
import { storageKey } from "@/shared/constants/storage";
import type { AppUser } from "@/domain/user/models";

const AUTH_USER_KEY = storageKey("auth_user");

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
		async function restoreSession() {
			try {
				const storedUser = await Storage.get(AUTH_USER_KEY, "object") as AppUser | null;

				if (storedUser?.isAnonymous) {
					// Anonymous users don't need API validation
					setUser(storedUser);
				} else if (storedUser && await authService.isSessionValid()) {
					// Refresh user data from API
					const result = await authService.getCurrentUser();
					if (result.success && result.user) {
						await Storage.set(AUTH_USER_KEY, result.user, "object");
						setUser(result.user);
					} else {
						await Storage.remove(AUTH_USER_KEY);
					}
				} else {
					await Storage.remove(AUTH_USER_KEY);
				}
			} catch {
				await Storage.remove(AUTH_USER_KEY);
			} finally {
				setIsLoading(false);
			}
		}

		restoreSession();
	}, []);

	const loginWithPassword = useCallback(async (email: string, password: string) => {
		setIsLoading(true);
		try {
			const result = await authService.loginWithPassword(email, password);
			if (result.success && result.user) {
				await Storage.set(AUTH_USER_KEY, result.user, "object");
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
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

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
			await Storage.set(AUTH_USER_KEY, anonymousUser, "object");
			setUser(anonymousUser);
			return { success: true, user: anonymousUser };
		} catch (error) {
			return {
				success: false,
				user: null,
				error: error instanceof Error ? error : new Error("Unknown error"),
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
			await Storage.remove(AUTH_USER_KEY);
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
				logout,
				continueWithoutAccount,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}
