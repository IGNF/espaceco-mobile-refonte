import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { router } from '@/app/router/routes';
import { subscribeSessionExpired } from '@/shared/errors/sessionExpiredSignal';
import { Alert } from '@/shared/ui/Alert';

const LOGIN_PATHS = new Set(['/login', '/auth/callback']);

export function SessionExpiredAlert() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isOpenRef = useRef(false);
  const reconnectRequestedRef = useRef(false);
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    return subscribeSessionExpired(() => {
      const currentUser = userRef.current;
      if (!currentUser || currentUser.isAnonymous || isOpenRef.current) {
        return;
      }
      if (LOGIN_PATHS.has(router.state.location.pathname)) {
        return;
      }

      isOpenRef.current = true;
      setIsOpen(true);
    });
  }, []);

  useEffect(() => {
    if (user && !user.isAnonymous) return;
    if (!isOpenRef.current) return;
    isOpenRef.current = false;
    setIsOpen(false);
  }, [user]);

  useEffect(() => {
    if (!reconnectRequestedRef.current || user) return;
    reconnectRequestedRef.current = false;
    void router.navigate('/login');
  }, [user]);

  const dismiss = () => {
    if (isLoggingOut) return;
    isOpenRef.current = false;
    setIsOpen(false);
  };

  const reconnect = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    reconnectRequestedRef.current = true;
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <Alert
      isOpen={isOpen}
      onClose={dismiss}
      title={t('login.sessionExpiredTitle')}
      subtitle={t('login.sessionExpired')}
      zIndex={2600}
      buttons={[
        {
          label: t('login.reconnect'),
          onClick: () => {
            void reconnect();
          },
          loading: isLoggingOut,
          disabled: isLoggingOut,
        },
        {
          label: t('common.close'),
          onClick: dismiss,
          variant: 'outline',
          disabled: isLoggingOut,
        },
      ]}
    />
  );
}
