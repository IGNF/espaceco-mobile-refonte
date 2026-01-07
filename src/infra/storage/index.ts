/**
 * Storage Adapters
 *
 * These adapters implement the storage interfaces from @ign/mobile-core
 * using Capacitor APIs from @ign/mobile-device.
 *
 * Usage:
 * import { CacheStorageAdapter, UserStorageAdapter, ReportStorageAdapter } from '@/infra/storage';
 *
 * // Create instances
 * const cacheStorage = new CacheStorageAdapter();
 * const userStorage = new UserStorageAdapter();
 * const reportStorage = new ReportStorageAdapter();
 *
 * // Pass to mobile-core managers
 * const cacheManager = new RasterCacheManager({ storage: cacheStorage });
 * const userManager = new UserManager({ storage: userStorage });
 */

export { CacheStorageAdapter } from './CacheStorageAdapter';
export { ReportStorageAdapter } from './ReportStorageAdapter';
export { UserStorageAdapter } from './UserStorageAdapter';
