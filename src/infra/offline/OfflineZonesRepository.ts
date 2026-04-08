import { ExtentManager } from '@ign/mobile-core';
import type { Extent } from 'ol/extent';
import type { OfflineZone } from '@/domain/offline/models';
import { cacheStorage } from '@/infra/storage/cacheStorage';

const extentManager = new ExtentManager(cacheStorage);

/**
 * Exposes named offline zones on top of `ExtentManager`.
 * A zone is just a reusable name associated with one or more extents.
 */
export class OfflineZonesRepository {
  async listZones(): Promise<OfflineZone[]> {
    const names = await extentManager.getNames();
    const zones = await Promise.all(
      names.map(async (name) => ({
        name,
        extents: await extentManager.get(name),
      }))
    );

    return zones.sort((firstZone, secondZone) => firstZone.name.localeCompare(secondZone.name));
  }

  async getZone(name: string): Promise<OfflineZone | null> {
    const extents = await extentManager.get(name);
    if (extents.length === 0) {
      return null;
    }

    return {
      name,
      extents,
    };
  }

  async saveZone(name: string, extents: Extent | Extent[]): Promise<OfflineZone> {
    const savedName = await extentManager.addExtent(name, extents);

    return {
      name: savedName,
      extents: await extentManager.get(savedName),
    };
  }

  async appendExtent(name: string, extent: Extent): Promise<OfflineZone> {
    await extentManager.appendExtent(name, extent);

    return {
      name,
      extents: await extentManager.get(name),
    };
  }

  async deleteZone(name: string): Promise<void> {
    await extentManager.deleteExtent(name);
  }

  /**
   * Returns one bounding box covering every extent from the selected zones.
   */
  async getUnionExtent(names: string[]): Promise<Extent | null> {
    if (names.length === 0) {
      return null;
    }

    return await extentManager.getAllInOneExtent(names);
  }

  async getExtents(names: string[]): Promise<Extent[]> {
    if (names.length === 0) {
      return [];
    }

    return await extentManager.getAllExtents(names);
  }
}
