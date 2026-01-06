import { App } from '@capacitor/app';

/**
 * Simple listener to listen to the app state changes
 */
export function initAppLifecycleListener() {
  App.addListener('appStateChange', ({ isActive }) => {
    console.log('App state changed. Is active?', isActive);
  });
}