import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

export async function initDevice() {
  console.log('initDevice');
  // Lets CSS target one platform, e.g. html[data-platform='android'].
  document.documentElement.dataset.platform = Capacitor.getPlatform();
  void StatusBar.setStyle({ style: Style.Light });
}
