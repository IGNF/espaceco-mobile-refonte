import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { I18nProvider } from './providers/I18nProvider';
import { AuthProvider } from './providers/AuthProvider';
import { CommunityProvider } from './providers/CommunityProvider';
import { OfflineProvider } from './providers/OfflineProvider';
import { router } from './router/routes';
import { EspaceCo_GpsSource } from '@/platform/device/gpsSource';
import { AppSettingsProvider } from './providers/AppSettingsProvider';
import { ExternalGpsProvider } from './providers/ExternalGpsProvider';

export function App() {
  useEffect(() => {
    void EspaceCo_GpsSource.restorePreferredSource();
  }, []);

  return (
    <I18nProvider>
      <ExternalGpsProvider>
        <AuthProvider>
          <AppSettingsProvider>
            <CommunityProvider>
              <OfflineProvider>
                <RouterProvider router={router} />
              </OfflineProvider>
            </CommunityProvider>
          </AppSettingsProvider>
        </AuthProvider>
      </ExternalGpsProvider>
    </I18nProvider>
  );
}
