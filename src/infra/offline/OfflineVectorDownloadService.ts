import { CollabVectorSource, type CommunityLayer, type Table } from '@ign/mobile-core';

import type { Extent } from 'ol/extent';
import type TileGrid from 'ol/tilegrid/TileGrid';

import type { OfflineDownloadProgress, OfflineCacheLayer } from '@/domain/offline/models';

import { collabApiClient } from '@/infra/api/collabApiClient';
import { getLayerMaxFeatures, getLayerOutputFormat, getTableTileZoom } from '@/infra/map/openlayers/vectorLayers';
import { cacheStorage } from '@/infra/storage/cacheStorage';

import { WEB_MERCATOR_PROJECTION } from '@/shared/constants/projections';
import { AppError } from '@/shared/errors/appError';
import { getCommunityLayerTitle } from '@/shared/utils/communityLayer';
import { getCommunityLayerKey } from '@/shared/utils/layerKey';
import { OFFLINE_DOWNLOAD_CANCELLED_CODE } from '@/shared/constants/offline';

interface OfflineVectorDownloadParams {
  communityId: number;
  layers: CommunityLayer[];
  extents: Extent[];
  excludedExtents?: Extent[];
  onProgress?: (progress: OfflineDownloadProgress) => void;
}

interface OfflineVectorDeleteLayer {
  layer: CommunityLayer;
  cacheNamespace?: string;
}

interface OfflineVectorDeleteParams {
  communityId: number;
  layers: OfflineVectorDeleteLayer[];
  extents: Extent[];
  excludedExtents?: Extent[];
}

interface PreparedOfflineLayer {
  layer: CommunityLayer;
  layerKey: string;
  cacheNamespace: string;
  source: CollabVectorSource;
  resolution: number;
  tileExtents: Extent[];
  loadedObjectCount: number;
}

interface DownloadedOfflineLayer {
  cacheLayer: OfflineCacheLayer;
  loadedObjectCount: number;
}

/**
 * Downloads collaborative vector tiles into the local feature cache.
 * The service keeps the flow sequential on purpose to stay predictable and easy to debug.
 */
export class OfflineVectorDownloadService {
  private cancelRequested = false;

  cancel(): void {
    this.cancelRequested = true;
  }

  countTiles(params: {
    communityId: number;
    layers: CommunityLayer[];
    extents: Extent[];
    excludedExtents?: Extent[];
  }): number {
    const preparedLayers = params.layers.map((layer) =>
      this.prepareLayer(
        params.communityId,
        layer,
        params.extents,
        undefined,
        params.excludedExtents
      )
    );

    let totalTileCount = 0;
    for (const preparedLayer of preparedLayers) {
      totalTileCount += preparedLayer.tileExtents.length;
    }

    return totalTileCount;
  }

  async downloadCache(
    params: OfflineVectorDownloadParams
  ): Promise<DownloadedOfflineLayer[]> {
    this.cancelRequested = false;
    const preparedLayers = params.layers.map((layer) =>
      this.prepareLayer(
        params.communityId,
        layer,
        params.extents,
        undefined,
        params.excludedExtents
      )
    );

    let totalTileCount = 0;
    for (const preparedLayer of preparedLayers) {
      totalTileCount += preparedLayer.tileExtents.length;
    }

    let downloadedTileCount = 0;
    params.onProgress?.({
      currentLayerTitle: getCommunityLayerTitle(preparedLayers[0]!.layer),
      downloadedTileCount,
      totalTileCount,
      percent: 0,
    });

    try {
      for (const preparedLayer of preparedLayers) {
        for (const tileExtent of preparedLayer.tileExtents) {
          this.throwIfCancelled();
          preparedLayer.loadedObjectCount += await this.loadTile(
            preparedLayer.source,
            tileExtent,
            preparedLayer.resolution
          );
          this.throwIfCancelled();

          preparedLayer.source.setLoading(true);
          preparedLayer.source.clear(true);
          preparedLayer.source.setLoading(false);

          downloadedTileCount += 1;
          params.onProgress?.({
            currentLayerTitle: getCommunityLayerTitle(preparedLayer.layer),
            downloadedTileCount,
            totalTileCount,
            percent: Math.round((downloadedTileCount / totalTileCount) * 100),
          });
        }
      }

      return preparedLayers.map((preparedLayer) => ({
        cacheLayer: {
          layerKey: preparedLayer.layerKey,
          layer: preparedLayer.layer,
          cacheNamespace: preparedLayer.cacheNamespace,
        },
        loadedObjectCount: preparedLayer.loadedObjectCount,
      }));
    } finally {
      this.cancelRequested = false;
    }
  }

  /**
   * Deletes the cached feature files generated for one offline cache.
   * It recomputes the same tile keys as the download flow to target only that cache data.
   */
  async deleteCacheData(params: OfflineVectorDeleteParams): Promise<void> {
    const preparedLayers = params.layers.map((cacheLayer) =>
      this.prepareLayer(
        params.communityId,
        cacheLayer.layer,
        params.extents,
        cacheLayer.cacheNamespace,
        params.excludedExtents
      )
    );

    for (const preparedLayer of preparedLayers) {
      const cacheKeys = new Set<string>();

      for (const tileExtent of preparedLayer.tileExtents) {
        for (const cacheKey of preparedLayer.source.getOfflineCacheKeys(
          tileExtent,
          preparedLayer.resolution
        )) {
          cacheKeys.add(cacheKey);
        }
      }

      for (const cacheKey of cacheKeys) {
        await cacheStorage.deleteFeatures(cacheKey);
      }

      preparedLayer.source.setLoading(true);
      preparedLayer.source.clear(true);
      preparedLayer.source.setLoading(false);
    }
  }

  /**
   * Builds a temporary collaborative source dedicated to offline download or deletion.
   * This source is never mounted on the live map; it only reuses the loader/cache logic.
   */
  private prepareLayer(
    communityId: number,
    layer: CommunityLayer,
    extents: Extent[],
    cacheNamespaceOverride?: string,
    excludedExtents: Extent[] = []
  ): PreparedOfflineLayer {
    const table = layer.table as Table;
    const layerKey = getCommunityLayerKey(layer);
    const tileZoom = getTableTileZoom(layer);
    const cacheNamespace = cacheNamespaceOverride ?? `offline-community-${communityId}-layer-${layer.id}`;
    const source = new CollabVectorSource({
      client: collabApiClient,
      table,
      cache: cacheStorage,
      cacheNamespace,
      legacyCacheFallback: false,
      online: true,
      useCacheWhenOnline: false,
      tileZoom,
      maxFeatures: getLayerMaxFeatures(layer),
      outputFormat: getLayerOutputFormat(layer),
    });
    const tileGrid = source.localProperties.tileGrid as TileGrid;
    const resolution = tileGrid.getResolution(tileZoom);

    return {
      layer,
      layerKey,
      cacheNamespace: source.getCacheNamespace(),
      source,
      resolution,
      tileExtents: this.getTileExtents(tileGrid, tileZoom, extents, excludedExtents),
      loadedObjectCount: 0,
    };
  }

  /**
   * Expands selected zones into unique tile extents.
   * Several zones can overlap, so we deduplicate tile coordinates before downloading.
   */
  private getTileExtents(
    tileGrid: TileGrid,
    tileZoom: number,
    extents: Extent[],
    excludedExtents: Extent[] = []
  ): Extent[] {
    const excludedTileKeys = new Set<string>();
    const tileKeys = new Set<string>();
    const tileExtents: Extent[] = [];

    for (const extent of excludedExtents) {
      tileGrid.forEachTileCoord(extent, tileZoom, (tileCoord) => {
        excludedTileKeys.add(tileCoord.join('-'));
      });
    }

    for (const extent of extents) {
      tileGrid.forEachTileCoord(extent, tileZoom, (tileCoord) => {
        const tileKey = tileCoord.join('-');

        if (excludedTileKeys.has(tileKey) || tileKeys.has(tileKey)) {
          return;
        }

        tileKeys.add(tileKey);
        tileExtents.push(tileGrid.getTileCoordExtent(tileCoord) as Extent);
      });
    }

    return tileExtents;
  }

  /**
   * Returns the number of objects loaded for the tile while `loaderFn` writes them to cache.
   */
  private async loadTile(
    source: CollabVectorSource,
    tileExtent: Extent,
    resolution: number
  ): Promise<number> {
    return await new Promise<number>((resolve, reject) => {
      source.loaderFn(
        tileExtent,
        resolution,
        WEB_MERCATOR_PROJECTION,
        (features) => {
          resolve(features.length);
        },
        () => {
          reject(
            new AppError({ kind: 'network', translationKey: 'errors.global.network' })
          );
        }
      );
    });
  }

  private throwIfCancelled(): void {
    if (!this.cancelRequested) {
      return;
    }

    throw new AppError({ kind: 'validation', translationKey: 'offline.status.cancelled', code: OFFLINE_DOWNLOAD_CANCELLED_CODE, retryable: false });
  }
}
