import { CommunityDevice } from '@capacitor-community/device';

/**
 * Reads the free disk space reported by the native device plugin.
 */
export class EspaceCo_DeviceStorage {
  static async getFreeDiskSpaceMb(): Promise<number | null> {
    try {
      const info = await CommunityDevice.getInfo();
      return info.realDiskFree ? Math.round((info.realDiskFree / 1024 / 1024) * 10) / 10 : null;
    } catch {
      return null;
    }
  }
}
