import { Storage } from '@ign/mobile-device';
import type { OfflineCommunityPackage } from '@/domain/offline/models';
import { storageKey } from '@/shared/constants/storage';

const OFFLINE_PACKAGES_STORAGE_KEY = storageKey('OFFLINE_PACKAGES');

/**
 * Persists one offline bundle definition per community.
 * This stores metadata only, not the downloaded vector features themselves.
 */
export class OfflinePackageRepository {
  async listPackages(): Promise<OfflineCommunityPackage[]> {
    const packages = await this.getAllPackages();
    return Object.values(packages).sort((firstPackage, secondPackage) => {
      const firstName = firstPackage.communityName ?? '';
      const secondName = secondPackage.communityName ?? '';

      return firstName.localeCompare(secondName) || firstPackage.communityId - secondPackage.communityId;
    });
  }

  async getPackage(communityId: number): Promise<OfflineCommunityPackage | null> {
    const packages = await this.getAllPackages();
    return packages[communityId] ?? null;
  }

  async savePackage(
    offlinePackage: OfflineCommunityPackage
  ): Promise<OfflineCommunityPackage> {
    const packages = await this.getAllPackages();
    packages[offlinePackage.communityId] = offlinePackage;
    await Storage.set(OFFLINE_PACKAGES_STORAGE_KEY, packages, 'object');
    return offlinePackage;
  }

  async deletePackage(communityId: number): Promise<void> {
    const packages = await this.getAllPackages();
    delete packages[communityId];
    await Storage.set(OFFLINE_PACKAGES_STORAGE_KEY, packages, 'object');
  }

  /**
   * Returns the full package map as stored in device preferences.
   */
  private async getAllPackages(): Promise<Record<string, OfflineCommunityPackage>> {
    return ((await Storage.get(
      OFFLINE_PACKAGES_STORAGE_KEY,
      'object'
    )) as Record<string, OfflineCommunityPackage> | null) ?? {};
  }
}
