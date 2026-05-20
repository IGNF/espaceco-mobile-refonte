import { App } from '@capacitor/app';

export function initAppEvents() {
  console.log('initAppEvents');
  initAppLifecycleListener();
}

/**
 * Simple listener to listen to the app state changes
 */
function initAppLifecycleListener() {
  App.addListener('appStateChange', ({ isActive }) => {
    console.log('App state changed. Is active?', isActive);
  });

  App.addListener('backButton', (data: any) => {
    console.log('Back button pressed', data);
  });
}