import { CacheStorageAdapter } from './CacheStorageAdapter';
import { ONLINE_VECTOR_CACHE_TTL_MS } from '@/shared/constants/storage';

/**
 * Shared cache storage instance used by map-related data sources.
 */
export const cacheStorage = new CacheStorageAdapter();

class OnlineVectorCacheStorageAdapter extends CacheStorageAdapter {
  async loadFeatures(layerId: string) {
    return this.loadFreshFeatures(layerId, ONLINE_VECTOR_CACHE_TTL_MS);
  }
}

export const onlineVectorCacheStorage = new OnlineVectorCacheStorageAdapter();
