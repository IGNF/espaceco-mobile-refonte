import { KeepAwake } from '@capacitor-community/keep-awake';

/**
 * Wrapper around Capacitor KeepAwake plugin.
 * Methods are intentionally safe on unsupported environments.
 */
export class EspaceCo_KeepAwake {
  static async keepAwake(): Promise<void> {
    try {
      await KeepAwake.keepAwake();
    } catch {
      console.warn('EspaceCo_KeepAwake.keepAwake: unsupported environment - probably a web/desktop browser');
    }
  }

  static async allowSleep(): Promise<void> {
    try {
      await KeepAwake.allowSleep();
    } catch {
      console.warn('EspaceCo_KeepAwake.allowSleep: unsupported environment - probably a web/desktop browser');
    }
  }
}
