const config = {
  appId: 'fr.ign.navi-forest',
  appName: 'Naviforest',
  webDir: 'dist',
  ios: {
    appId: 'fr.ign.navi-forest',
  },
  android: {
    appId: 'fr.ign.naviforest',
  },
  cordova: {
    preferences: {
      bluetooth_restore_state: 'true',
      accessBackgroundLocation: 'false',
    },
  },
};

export default config;
