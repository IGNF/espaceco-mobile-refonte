import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { I18nProvider } from './providers/I18nProvider';
import { AuthProvider } from './providers/AuthProvider';
import { CommunityProvider } from './providers/CommunityProvider';
import { OfflineProvider } from './providers/OfflineProvider';
import { router } from './router/routes';
import { SessionExpiredAlert } from './components/SessionExpiredAlert/SessionExpiredAlert';
import { EspaceCo_GpsSource } from '@/platform/device/gpsSource';
import { AppSettingsProvider } from './providers/AppSettingsProvider';
import { MapPanelProvider } from '@/shared/layout/MapPanelProvider';

export function App() {
  useEffect(() => {
    void EspaceCo_GpsSource.restorePreferredSource();
  }, []);

  return (
    <I18nProvider>
      <AuthProvider>
        <AppSettingsProvider>
          <CommunityProvider>
            <OfflineProvider>
              <MapPanelProvider>
                <RouterProvider router={router} />
              </MapPanelProvider>
            </OfflineProvider>
          </CommunityProvider>
        </AppSettingsProvider>
        <SessionExpiredAlert />
      </AuthProvider>
    </I18nProvider>
  );
}
