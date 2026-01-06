import { useState, useCallback, type ReactNode } from 'react';
import { storageKey } from '@/shared/constants/storage';
import { AuthContext } from './AuthContext';
import type { User } from '@/domain/auth/models';

const AUTH_STORAGE_KEY = storageKey('auth_user');

function getStoredUser(): User | null {
  const stored = localStorage.getItem(AUTH_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }
  return null;
}

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider is a component that provides the authentication context to the app.
 * @param children - The children to render inside the AuthProvider.
 * @returns The AuthProvider component.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(getStoredUser);

  const login = useCallback(async (email: string, password: string) => {
    console.log('login', email, password);
    // TODO: Replace with actual API call
    const mockUser: User = {
      id: '1',
      email,
      name: 'John Doe',
    };

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockUser));
    setUser(mockUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    // call API to logout here
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading: false,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
