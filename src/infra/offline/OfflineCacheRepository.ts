import { Storage } from '@ign/mobile-device';
import type { OfflineCommunityCache } from '@/domain/offline/models';
import { storageKey } from '@/shared/constants/storage';

const OFFLINE_CACHES_STORAGE_KEY = storageKey('OFFLINE_CACHES');

/**
 * Persists one offline cache definition per community.
 * This stores metadata only, not the downloaded vector features themselves.
 */
export class OfflineCacheRepository {
  async listCaches(): Promise<OfflineCommunityCache[]> {
    const caches = await this.getAllCaches();
    return Object.values(caches).sort((firstCache, secondCache) => {
      const firstName = firstCache.communityName ?? '';
      const secondName = secondCache.communityName ?? '';

      return firstName.localeCompare(secondName) || firstCache.communityId - secondCache.communityId;
    });
  }

  async getCache(communityId: number): Promise<OfflineCommunityCache | null> {
    const caches = await this.getAllCaches();
    return caches[communityId] ?? null;
  }

  async saveCache(
    offlineCache: OfflineCommunityCache
  ): Promise<OfflineCommunityCache> {
    const caches = await this.getAllCaches();
    caches[offlineCache.communityId] = offlineCache;
    await Storage.set(OFFLINE_CACHES_STORAGE_KEY, caches, 'object');
    return offlineCache;
  }

  async deleteCache(communityId: number): Promise<void> {
    const caches = await this.getAllCaches();
    delete caches[communityId];
    await Storage.set(OFFLINE_CACHES_STORAGE_KEY, caches, 'object');
  }

  /**
   * Returns the full cache map as stored in device preferences.
   */
  private async getAllCaches(): Promise<Record<string, OfflineCommunityCache>> {
    return ((await Storage.get(
      OFFLINE_CACHES_STORAGE_KEY,
      'object'
    )) as Record<string, OfflineCommunityCache> | null) ?? {};
  }
}
