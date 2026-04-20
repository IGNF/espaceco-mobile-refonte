import { FileSystem } from '@ign/mobile-device';

import type TileGrid from 'ol/tilegrid/TileGrid';
import type { Extent } from 'ol/extent';
import ol_layer_Geoportail from 'ol-ext/layer/Geoportail';

import { AppError } from '@/shared/errors/appError';
import { WEB_MERCATOR_PROJECTION } from '@/shared/constants/projections';
import { GEOPORTAIL_SERVER } from '@/shared/constants/map';
import { OFFLINE_RASTER_DOWNLOAD_CANCELLED_CODE } from '@/shared/constants/offline';

import type {
  OfflineDownloadProgress,
  OfflineRasterDownloadPreview,
  OfflineRasterMap,
} from '@/domain/offline/models';
import { cacheStorage } from '@/infra/storage/cacheStorage';
import { getOfflineRasterTileKey } from '@/infra/map/openlayers/offlineRasterLayers';

interface RasterTileEntry {
  key: string;
  url: string;
}

export class OfflineRasterDownloadService {
  private isCancelled = false;

  cancel(): void {
    this.isCancelled = true;
  }

  countTiles(params: {
    rasterMap: Pick<OfflineRasterMap, 'id' | 'layerName' | 'minZoom' | 'maxZoom'>;
    extents: Extent[];
    excludedExtents?: Extent[];
  }): number {
    return this.getTileEntries(params).length;
  }

  /**
   * Estimates a raster download by counting all target tiles and sampling one real tile request.
   */
  async estimateDownload(params: {
    rasterMap: OfflineRasterMap;
    extents: Extent[];
    excludedExtents?: Extent[];
  }): Promise<OfflineRasterDownloadPreview> {
    const tileEntries = this.getTileEntries(params);
    const tileCount = tileEntries.length;

    if (tileCount === 0) {
      return {
        tileCount: 0,
        estimatedSizeMb: 0,
        estimatedTimeMs: 0,
      };
    }

    const sampleTile = tileEntries[0]!;
    const startedAt = Date.now();
    const response = await fetch(sampleTile.url);

    if (!response.ok) {
      throw new AppError({ kind: 'network', translationKey: 'errors.global.network', message: `Raster tile estimate failed with status ${response.status}` });
    }

    const blob = await response.blob();
    const elapsedMs = Math.max(Date.now() - startedAt, 1);

    return {
      tileCount,
      estimatedSizeMb: Math.round((tileCount * blob.size / 1024 / 1024) * 10) / 10,
      estimatedTimeMs: tileCount * elapsedMs,
    };
  }

  async downloadMap(params: {
    rasterMap: Pick<OfflineRasterMap, 'id' | 'name' | 'layerName' | 'minZoom' | 'maxZoom'>;
    extents: Extent[];
    excludedExtents?: Extent[];
    onProgress?: (progress: OfflineDownloadProgress) => void;
  }): Promise<void> {
    this.isCancelled = false;

    const tileEntries = this.getTileEntries(params);
    const totalTileCount = tileEntries.length;
    const savedKeys: string[] = [];

    params.onProgress?.({
      currentLayerTitle: params.rasterMap.name,
      downloadedTileCount: 0,
      totalTileCount,
      percent: totalTileCount === 0 ? 100 : 0,
    });

    try {
      for (let index = 0; index < tileEntries.length; index += 1) {
        if (this.isCancelled) {
          throw new AppError({ kind: 'validation', translationKey: 'offline.status.cancelled', message: 'Offline raster download cancelled', retryable: false, code: OFFLINE_RASTER_DOWNLOAD_CANCELLED_CODE });
        }

        const tileEntry = tileEntries[index];
        const response = await fetch(tileEntry.url);

        if (!response.ok) {
          throw new AppError({ kind: 'network', translationKey: 'errors.global.network', message: `Raster tile download failed with status ${response.status}` });
        }

        const blob = await response.blob();
        await cacheStorage.saveTile(tileEntry.key, blob);
        savedKeys.push(tileEntry.key);

        const downloadedTileCount = index + 1;
        params.onProgress?.({
          currentLayerTitle: params.rasterMap.name,
          downloadedTileCount,
          totalTileCount,
          percent:
            totalTileCount === 0
              ? 100
              : Math.round((downloadedTileCount / totalTileCount) * 100),
        });
      }
    } catch (error) {
      for (const key of savedKeys) {
        await cacheStorage.deleteTile(key);
      }

      throw error;
    } finally {
      this.isCancelled = false;
    }
  }

  async deleteMapData(rasterMapId: string): Promise<void> {
    try {
      await FileSystem.removeDirectory({
        path: `tiles/raster/${rasterMapId}`,
        directory: 'CACHE',
        recursive: true,
      });
    } catch {
      // Ignore missing directories.
    }
  }

  private getTileEntries(params: {
    rasterMap: Pick<OfflineRasterMap, 'id' | 'layerName' | 'minZoom' | 'maxZoom'>;
    extents: Extent[];
    excludedExtents?: Extent[];
  }): RasterTileEntry[] {
    const layer = new ol_layer_Geoportail(params.rasterMap.layerName, {
      visible: false,
    }, {
      server: GEOPORTAIL_SERVER,
    });

    const source = layer.getSource() as unknown as {
      getTileGrid(): TileGrid;
      getTileUrlFunction(): (
        tileCoord: number[],
        pixelRatio: number,
        projection: string
      ) => string | undefined;
    };

    const tileGrid = source.getTileGrid();
    const tileUrlFunction = source.getTileUrlFunction();
    const excludedTileKeys = new Set<string>();
    const tileEntries: RasterTileEntry[] = [];

    for (const excludedExtent of params.excludedExtents ?? []) {
      for (let zoom = params.rasterMap.minZoom; zoom <= params.rasterMap.maxZoom; zoom += 1) {
        tileGrid.forEachTileCoord(excludedExtent, zoom, (tileCoord) => {
          excludedTileKeys.add(tileCoord.join('/'));
        });
      }
    }

    const tileKeys = new Set<string>();

    for (const extent of params.extents) {
      for (let zoom = params.rasterMap.minZoom; zoom <= params.rasterMap.maxZoom; zoom += 1) {
        tileGrid.forEachTileCoord(extent, zoom, (tileCoord) => {
          const tileCoordKey = tileCoord.join('/');
          if (excludedTileKeys.has(tileCoordKey) || tileKeys.has(tileCoordKey)) {
            return;
          }

          const url = tileUrlFunction(tileCoord, 1, WEB_MERCATOR_PROJECTION);
          if (!url) {
            return;
          }

          tileKeys.add(tileCoordKey);
          tileEntries.push({
            key: getOfflineRasterTileKey(params.rasterMap.id, tileCoord),
            url,
          });
        });
      }
    }

    return tileEntries;
  }
}
