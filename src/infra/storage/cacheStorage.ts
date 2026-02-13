import { CacheStorageAdapter } from './CacheStorageAdapter';

/**
 * Shared cache storage instance used by map-related data sources.
 */
export const cacheStorage = new CacheStorageAdapter();
