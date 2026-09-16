import { App } from '@capacitor/app';
import { getNavigationMode, SimplifiedNavigationMode } from '../device/androidNavMode';

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

  App.addListener('backButton', async (data: any) => {

    console.log('[navigation] Back button pressed', data);
    const navigationMode = await getNavigationMode();
    console.log('[navigation] Navigation mode:', navigationMode);

    // enable the back button if the navigation mode is buttons
    if (navigationMode === SimplifiedNavigationMode.Buttons) {
      console.log('[navigation] Enabling back button');
    }
  });
}