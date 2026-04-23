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
  OfflineRasterDownloadResult,
  OfflineRasterMap,
} from '@/domain/offline/models';
import { cacheStorage } from '@/infra/storage/cacheStorage';
import { getOfflineRasterTileKey } from '@/infra/map/openlayers/offlineRasterLayers';

interface RasterTileEntry {
  key: string;
  tileCoord: number[];
  url: string;
}

export class OfflineRasterDownloadService {
  private isCancelled = false;
  private currentAbortController: AbortController | null = null;

  /**
   * Stops the current tile request immediately when possible.
   * The download loop still normalizes the result to the app cancellation error.
   */
  cancel(): void {
    this.isCancelled = true;
    this.currentAbortController?.abort();
  }

  /**
   * Estimates a raster download by counting all target tiles and sampling one real tile request.
   */
  async estimateDownload(params: {
    rasterMap: OfflineRasterMap;
    extents: Extent[];
    excludedExtents?: Extent[];
  }): Promise<OfflineRasterDownloadPreview> {
    const tileEntries = this.getTileEntriesForExtents(params);
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
  }): Promise<OfflineRasterDownloadResult> {
    this.isCancelled = false;

    const tileEntries = this.getTileEntriesForExtents(params);
    return this.downloadTileEntries(
      params.rasterMap.name,
      tileEntries,
      params.onProgress
    );
  }

  async retryFailedTiles(params: {
    rasterMap: Pick<OfflineRasterMap, 'id' | 'name' | 'layerName' | 'minZoom' | 'maxZoom'>;
    failedTileCoords: number[][];
    onProgress?: (progress: OfflineDownloadProgress) => void;
  }): Promise<OfflineRasterDownloadResult> {
    this.isCancelled = false;

    const tileEntries = this.getTileEntriesForCoords(
      params.rasterMap,
      params.failedTileCoords
    );

    return this.downloadTileEntries(
      params.rasterMap.name,
      tileEntries,
      params.onProgress
    );
  }

  /**
   * Uses one cancellation error shape for manual cancellation and aborted fetches.
   */
  private throwCancelledDownload(): never {
    throw new AppError({ kind: 'validation', translationKey: 'offline.status.cancelled', message: 'Offline raster download cancelled', retryable: false, code: OFFLINE_RASTER_DOWNLOAD_CANCELLED_CODE });
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

  private getTileEntriesForCoords(
    rasterMap: Pick<OfflineRasterMap, 'id' | 'layerName' | 'minZoom' | 'maxZoom'>,
    tileCoords: number[][]
  ): RasterTileEntry[] {
    const { tileUrlFunction } = this.getGeoportailSource(rasterMap.layerName);

    return tileCoords.map((tileCoord) => ({
      key: getOfflineRasterTileKey(rasterMap.id, tileCoord),
      tileCoord,
      url: tileUrlFunction(tileCoord, 1, WEB_MERCATOR_PROJECTION)!,
    }));
  }

  private getTileEntriesForExtents(params: {
    rasterMap: Pick<OfflineRasterMap, 'id' | 'layerName' | 'minZoom' | 'maxZoom'>;
    extents: Extent[];
    excludedExtents?: Extent[];
  }): RasterTileEntry[] {
    const { tileGrid, tileUrlFunction } = this.getGeoportailSource(params.rasterMap.layerName);

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
            tileCoord,
            url,
          });
        });
      }
    }

    return tileEntries;
  }

  /**
   * ol-ext does not expose a typed Geoportail source, so the tile grid and URL builder are read here once.
   */
  private getGeoportailSource(layerName: string): {
    tileGrid: TileGrid;
    tileUrlFunction: (
      tileCoord: number[],
      pixelRatio: number,
      projection: string
    ) => string | undefined;
  } {
    const layer = new ol_layer_Geoportail(layerName, {
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

    return {
      tileGrid: source.getTileGrid(),
      tileUrlFunction: source.getTileUrlFunction(),
    };
  }

  private async downloadTileEntries(
    rasterMapName: string,
    tileEntries: RasterTileEntry[],
    onProgress?: (progress: OfflineDownloadProgress) => void
  ): Promise<OfflineRasterDownloadResult> {
    const totalTileCount = tileEntries.length;
    let downloadedTileCount = 0;
    const failedTileCoords: number[][] = [];

    onProgress?.({
      currentLayerTitle: rasterMapName,
      downloadedTileCount: 0,
      totalTileCount,
      percent: totalTileCount === 0 ? 100 : 0,
    });

    try {
      for (let index = 0; index < tileEntries.length; index += 1) {
        if (this.isCancelled) {
          this.throwCancelledDownload();
        }

        const tileEntry = tileEntries[index];
        const abortController = new AbortController();
        this.currentAbortController = abortController;

        try {
          const response = await fetch(tileEntry.url, {
            signal: abortController.signal,
          });

          if (!response.ok) {
            throw new AppError({ kind: 'network', translationKey: 'errors.global.network', message: `Raster tile download failed with status ${response.status}` });
          }

          const blob = await response.blob();
          this.currentAbortController = null;

          if (this.isCancelled) {
            this.throwCancelledDownload();
          }

          await cacheStorage.saveTile(tileEntry.key, blob);
          downloadedTileCount += 1;
        } catch (error) {
          this.currentAbortController = null;

          if (this.isCancelled || (error instanceof Error && error.name === 'AbortError')) {
            this.throwCancelledDownload();
          }

          failedTileCoords.push(tileEntry.tileCoord);
        }

        onProgress?.({
          currentLayerTitle: rasterMapName,
          downloadedTileCount,
          totalTileCount,
          percent:
            totalTileCount === 0
              ? 100
              : Math.round(((index + 1) / totalTileCount) * 100),
        });
      }

      return {
        totalTileCount,
        downloadedTileCount,
        failedTileCoords,
      };
    } finally {
      this.currentAbortController = null;
      this.isCancelled = false;
    }
  }
}
