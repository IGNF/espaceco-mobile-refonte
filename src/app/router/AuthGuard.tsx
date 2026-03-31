import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Loading } from '@/shared/ui/Loading';
import styles from './AuthGuard.module.css';

/**
 * AuthGuard is a component that protects routes by redirecting to the login page if the user is not authenticated.
 * @returns The AuthGuard component.
 */
export function AuthGuard() {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Wait for session restoration before deciding
  if (isLoading) {
    return (
      <div className={styles.loadingScreen} role='status' aria-live='polite'>
        <Loading size='large' label={t('login.restoringSession')} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
