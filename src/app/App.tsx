import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { I18nProvider } from './providers/I18nProvider';
import { AuthProvider } from './providers/AuthProvider';
import { CommunityProvider } from './providers/CommunityProvider';
import { OfflineProvider } from './providers/OfflineProvider';
import { router } from './router/routes';
import { EspaceCo_GpsSource } from '@/platform/device/gpsSource';
import { MapSettingsProvider } from './providers/MapSettingsProvider';

export function App() {
  useEffect(() => {
    void EspaceCo_GpsSource.restorePreferredSource();
  }, []);

  return (
    <I18nProvider>
      <AuthProvider>
        <MapSettingsProvider>
          <CommunityProvider>
            <OfflineProvider>
              <RouterProvider router={router} />
            </OfflineProvider>
          </CommunityProvider>
        </MapSettingsProvider>
      </AuthProvider>
    </I18nProvider>
  );
}
