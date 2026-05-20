import { StatusBar, Style } from '@capacitor/status-bar';

export async function initDevice() {
  console.log('initDevice');
  void StatusBar.setStyle({ style: Style.Light });
}