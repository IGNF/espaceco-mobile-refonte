const config = {
  appId: 'fr.ign.collaboratif',
  appName: 'Espace collaboratif IGN',
  webDir: 'dist',
  ios: {
    appId: 'fr.ign.collaboratif',
  },
  android: {
    appId: 'fr.ign.guichet',
  },
  cordova: {
    preferences: {
      bluetooth_restore_state: 'true',
      accessBackgroundLocation: 'false',
    },
  },
};

export default config;
