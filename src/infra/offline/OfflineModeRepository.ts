import { Storage } from '@ign/mobile-device';
import type { OfflineMode } from '@/domain/offline/models';
import { storageKey } from '@/shared/constants/storage';

const OFFLINE_MODE_STORAGE_KEY = storageKey('OFFLINE_MODE');

function normalizeOfflineMode(value: OfflineMode | null): OfflineMode {
  return value === 'offline' ? 'offline' : 'online';
}

/**
 * Persists the user-requested mode.
 * The effective mode is still derived at runtime from connectivity and offline data availability.
 */
export class OfflineModeRepository {
  async getRequestedMode(): Promise<OfflineMode> {
    const mode = await Storage.get(OFFLINE_MODE_STORAGE_KEY);
    return normalizeOfflineMode(mode as OfflineMode | null);
  }

  async saveRequestedMode(mode: OfflineMode): Promise<OfflineMode> {
    await Storage.set(OFFLINE_MODE_STORAGE_KEY, mode);
    return mode;
  }
}
