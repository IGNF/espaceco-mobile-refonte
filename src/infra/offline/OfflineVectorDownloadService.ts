import {
  CollabVectorSource,
  type CommunityLayer,
  type Table,
} from '@ign/mobile-core';
import type { Extent } from 'ol/extent';
import type TileGrid from 'ol/tilegrid/TileGrid';
import type {
  OfflineDownloadProgress,
  OfflinePackageLayer,
} from '@/domain/offline/models';
import { collabApiClient } from '@/infra/api/collabApiClient';
import {
  getLayerMaxFeatures,
  getLayerOutputFormat,
  getTableTileZoom,
} from '@/infra/map/openlayers/vectorLayers';
import { cacheStorage } from '@/infra/storage/cacheStorage';
import { WEB_MERCATOR_PROJECTION } from '@/shared/constants/projections';
import { AppError } from '@/shared/errors/appError';
import { getCommunityLayerKey } from '@/shared/utils/layerKey';

interface OfflineVectorDownloadParams {
  communityId: number;
  layers: CommunityLayer[];
  extents: Extent[];
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
}

interface PreparedOfflineLayer {
  layer: CommunityLayer;
  layerKey: string;
  cacheNamespace: string;
  source: CollabVectorSource;
  resolution: number;
  tileExtents: Extent[];
}

export const OFFLINE_DOWNLOAD_CANCELLED_CODE = 'offline_download_cancelled';

const OFFLINE_DOWNLOAD_CANCELLED_MESSAGE = 'Offline download cancelled';

/**
 * Downloads collaborative vector tiles into the local feature cache.
 * The service keeps the flow sequential on purpose to stay predictable and easy to debug.
 */
export class OfflineVectorDownloadService {
  private cancelRequested = false;

  cancel(): void {
    this.cancelRequested = true;
  }

  async downloadPackage(
    params: OfflineVectorDownloadParams
  ): Promise<OfflinePackageLayer[]> {
    this.cancelRequested = false;
    const preparedLayers = params.layers.map((layer) =>
      this.prepareLayer(params.communityId, layer, params.extents)
    );

    let totalTileCount = 0;
    for (const preparedLayer of preparedLayers) {
      totalTileCount += preparedLayer.tileExtents.length;
    }

    let downloadedTileCount = 0;
    params.onProgress?.({
      currentLayerTitle: preparedLayers[0]!.layer.title,
      downloadedTileCount,
      totalTileCount,
      percent: 0,
    });

    try {
      for (const preparedLayer of preparedLayers) {
        for (const tileExtent of preparedLayer.tileExtents) {
          this.throwIfCancelled();
          await this.loadTile(
            preparedLayer.source,
            tileExtent,
            preparedLayer.resolution
          );
          preparedLayer.source.clear(true);

          downloadedTileCount += 1;
          params.onProgress?.({
            currentLayerTitle: preparedLayer.layer.title,
            downloadedTileCount,
            totalTileCount,
            percent: Math.round((downloadedTileCount / totalTileCount) * 100),
          });
        }
      }

      return preparedLayers.map((preparedLayer) => ({
        layerKey: preparedLayer.layerKey,
        layer: preparedLayer.layer,
        cacheNamespace: preparedLayer.cacheNamespace,
      }));
    } finally {
      this.cancelRequested = false;
    }
  }

  /**
   * Deletes the cached feature files generated for one offline package.
   * It recomputes the same tile keys as the download flow to target only that package data.
   */
  async deletePackageData(params: OfflineVectorDeleteParams): Promise<void> {
    const preparedLayers = params.layers.map((packageLayer) =>
      this.prepareLayer(
        params.communityId,
        packageLayer.layer,
        params.extents,
        packageLayer.cacheNamespace
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

      preparedLayer.source.clear(true);
    }
  }

  /**
   * Builds a temporary collaborative source dedicated to offline download or deletion.
   * This source is never mounted on the live map; it only reuses the loader/cache logic.
   */
  private prepareLayer(communityId: number, layer: CommunityLayer, extents: Extent[], cacheNamespaceOverride?: string): PreparedOfflineLayer {
    const table = layer.table as Table;
    const layerKey = getCommunityLayerKey(layer);
    const tileZoom = getTableTileZoom(layer);
    const cacheNamespace = cacheNamespaceOverride ?? `offline-community-${communityId}-layer-${layer.id}`;
    const source = new CollabVectorSource({
      client: collabApiClient,
      table,
      cache: cacheStorage,
      cacheNamespace,
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
      tileExtents: this.getTileExtents(tileGrid, tileZoom, extents),
    };
  }

  /**
   * Expands selected zones into unique tile extents.
   * Several zones can overlap, so we deduplicate tile coordinates before downloading.
   */
  private getTileExtents(
    tileGrid: TileGrid,
    tileZoom: number,
    extents: Extent[]
  ): Extent[] {
    const tileKeys = new Set<string>();
    const tileExtents: Extent[] = [];

    for (const extent of extents) {
      tileGrid.forEachTileCoord(extent, tileZoom, (tileCoord) => {
        const tileKey = tileCoord.join('-');

        if (tileKeys.has(tileKey)) {
          return;
        }

        tileKeys.add(tileKey);
        tileExtents.push(tileGrid.getTileCoordExtent(tileCoord) as Extent);
      });
    }

    return tileExtents;
  }

  private async loadTile(
    source: CollabVectorSource,
    tileExtent: Extent,
    resolution: number
  ): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      source.loaderFn(
        tileExtent,
        resolution,
        WEB_MERCATOR_PROJECTION,
        () => {
          resolve();
        },
        () => {
          reject(
            new AppError({ kind: 'network', translationKey: 'errors.global.network', message: `Failed to download tile ${tileExtent.join(',')}` })
          );
        }
      );
    });
  }

  private throwIfCancelled(): void {
    if (!this.cancelRequested) {
      return;
    }

    throw new AppError({ kind: 'validation', translationKey: 'errors.global.validation', message: OFFLINE_DOWNLOAD_CANCELLED_MESSAGE, code: OFFLINE_DOWNLOAD_CANCELLED_CODE, retryable: false });
  }
}
