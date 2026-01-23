import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';

/**
 * AuthGuard is a component that protects routes by redirecting to the login page if the user is not authenticated.
 * @returns The AuthGuard component.
 */
export function AuthGuard() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Wait for session restoration before deciding
  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
