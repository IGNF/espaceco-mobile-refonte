import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';

/**
 * AuthGuard is a component that protects routes by redirecting to the login page if the user is not authenticated.
 * @returns The AuthGuard component.
 */
export function AuthGuard() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  /**
   * If the user is not authenticated, redirect to the login page.
   * @returns The Navigate component.
   */
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
