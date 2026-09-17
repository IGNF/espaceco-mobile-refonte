import { App } from '@capacitor/app';
import { dismissTopBackHandler } from '@/shared/hooks/useBackHandler';
import { getNavigationMode, SimplifiedNavigationMode } from '../device/androidNavMode';

export function initAppEvents() {
  initAppLifecycleListener();
}

function initAppLifecycleListener() {
  App.addListener('appStateChange', ({ isActive }) => {
    console.log('App state changed. Is active?', isActive);
  });

  App.addListener('backButton', async ({ canGoBack }) => {
    const navigationMode = await getNavigationMode().catch(
      () => SimplifiedNavigationMode.Buttons,
    );

    if (navigationMode !== SimplifiedNavigationMode.Buttons) {
      return;
    }

    if (dismissTopBackHandler()) {
      return;
    }

    if (canGoBack) {
      window.history.back();
      return;
    }

    await App.minimizeApp();
  });
}
