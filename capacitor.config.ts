import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'fr.ign.espaceco',
  appName: 'espaceco',
  webDir: 'dist',
  cordova: {
    preferences: {
      bluetooth_restore_state: 'true',
      accessBackgroundLocation: 'false',
    },
  },
};

export default config;
