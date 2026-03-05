import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { I18nProvider } from './providers/I18nProvider';
import { AuthProvider } from './providers/AuthProvider';
import { CommunityProvider } from './providers/CommunityProvider';
import { router } from './router/routes';
import { EspaceCo_GpsSource } from '@/platform/device/gpsSource';

export function App() {
  useEffect(() => {
    void EspaceCo_GpsSource.restorePreferredSource();
  }, []);

  return (
    <I18nProvider>
      <AuthProvider>
        <CommunityProvider>
          <RouterProvider router={router} />
        </CommunityProvider>
      </AuthProvider>
    </I18nProvider>
  );
}
