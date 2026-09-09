import { StatusBar, Style } from '@capacitor/status-bar';

import { performanceMonitor } from '@/features/performance/services/performanceMonitor';

export async function initDevice() {
  console.log('initDevice');
  void StatusBar.setStyle({ style: Style.Light });
  void performanceMonitor.start({
    scenario: 'session automatique',
    notes: "Démarrage automatique au lancement de l'application",
  });
}