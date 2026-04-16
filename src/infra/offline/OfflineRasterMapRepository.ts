import { Storage } from '@ign/mobile-device';
import type { OfflineRasterMap } from '@/domain/offline/models';
import { storageKey } from '@/shared/constants/storage';

const OFFLINE_RASTER_MAPS_STORAGE_KEY = storageKey('OFFLINE_RASTER_MAPS');

/**
 * Persists offline raster map definitions. This stores raster map metadata only, not the downloaded tile files.
 */
export class OfflineRasterMapRepository {
  async listMaps(): Promise<OfflineRasterMap[]> {
    const maps = await this.getAllMaps();
    return Object.values(maps).sort((firstMap, secondMap) =>
      firstMap.name.localeCompare(secondMap.name)
    );
  }

  async getMap(mapId: string): Promise<OfflineRasterMap | null> {
    const maps = await this.getAllMaps();
    return maps[mapId] ?? null;
  }

  async saveMap(offlineRasterMap: OfflineRasterMap): Promise<OfflineRasterMap> {
    const maps = await this.getAllMaps();
    maps[offlineRasterMap.id] = offlineRasterMap;
    await Storage.set(OFFLINE_RASTER_MAPS_STORAGE_KEY, maps, 'object');
    return offlineRasterMap;
  }

  async deleteMap(mapId: string): Promise<void> {
    const maps = await this.getAllMaps();
    delete maps[mapId];
    await Storage.set(OFFLINE_RASTER_MAPS_STORAGE_KEY, maps, 'object');
  }

  private async getAllMaps(): Promise<Record<string, OfflineRasterMap>> {
    return ((await Storage.get(OFFLINE_RASTER_MAPS_STORAGE_KEY, 'object')) as Record<string, OfflineRasterMap> | null) ?? {};
  }
}
