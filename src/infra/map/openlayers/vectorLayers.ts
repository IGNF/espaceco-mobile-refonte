import type BaseLayer from 'ol/layer/Base';
import type { ApiClient } from 'collaboratif-client-api';
import {
  CollabVectorLayer,
  WFSLayer,
  type CommunityLayer
} from '@ign/mobile-core';
import { stripQueryParams } from '@/shared/utils/query';
import { USE_LAYER_FEATURE_CACHE_WHEN_ONLINE } from '@/shared/constants/map';
import { cacheStorage } from '@/infra/storage/cacheStorage';

/**
 * Create OpenLayers vector layers from enriched community layer data.
 * Handles WFS geoservice layers and table-based collaborative layers.
 */
export function createCommunityVectorLayers(
  layers: CommunityLayer[],
  apiClient: ApiClient
): BaseLayer[] {
  const olLayers: BaseLayer[] = [];

  for (const layer of layers) {
    try {
      const olLayer = createVectorLayer(layer, apiClient);
      if (olLayer) {
        olLayers.push(olLayer);
      }
    } catch (err) {
      console.error(
        `[VectorLayers] Failed to create layer "${layer.title}":`,
        err
      );
    }
  }

  return olLayers;
}

function createVectorLayer(
  layer: CommunityLayer,
  apiClient: ApiClient
): BaseLayer | null {
  const geoservice = layer.geoservice;
  if (geoservice && (geoservice.type as string)?.toUpperCase() === 'WFS') {
    return new WFSLayer({
      geoservice,
      visibility: getLayerVisibility(layer),
      opacity: getLayerOpacity(layer),
      useCacheWhenOnline: USE_LAYER_FEATURE_CACHE_WHEN_ONLINE,
    } as any, cacheStorage as any);
  }

  const wfsUrl = getTableWfsUrl(layer);
  if (layer.table && wfsUrl) {
    const table = layer.table;
    const cacheUrl = `${layer.database ?? table.database ?? ''}:${table.name}`;
    const online =
      typeof navigator === 'undefined' ? true : navigator.onLine;

    const collabLayer = new CollabVectorLayer(
      {
        database: String(layer.database ?? table.database ?? ''),
        name: table.name,
        url: stripQueryParams(wfsUrl),
        client: apiClient,
        table,
        cacheUrl,
      },
      {
        tileZoom: getTableTileZoom(layer),
        maxFeatures: 5000,
        online,
        useCacheWhenOnline: USE_LAYER_FEATURE_CACHE_WHEN_ONLINE,
        cache: cacheStorage,
      } as any
    );

    const visibility = getLayerVisibility(layer);
    if (typeof visibility === 'boolean') {
      collabLayer.setVisible(visibility);
    }

    const opacity = getLayerOpacity(layer);
    if (typeof opacity === 'number') {
      collabLayer.setOpacity(opacity);
    }

    return collabLayer;
  }

  return null;
}

function getLayerVisibility(layer: CommunityLayer): boolean | undefined {
  return layer.visible;
}

function getLayerOpacity(layer: CommunityLayer): number | undefined {
  return typeof layer.opacity === 'number' ? layer.opacity : undefined;
}

function getTableWfsUrl(layer: CommunityLayer): string | undefined {
  const tableAny = layer.table as { wfs?: unknown; wfs_url?: unknown } | undefined;
  if (!tableAny) return undefined;

  if (typeof tableAny.wfs === 'string' && tableAny.wfs.length > 0) {
    return tableAny.wfs;
  }

  if (typeof tableAny.wfs_url === 'string' && tableAny.wfs_url.length > 0) {
    return tableAny.wfs_url;
  }

  return undefined;
}

function getTableTileZoom(layer: CommunityLayer): number {
  const tableAny = layer.table as {
    tileZoomLevel?: unknown;
    tile_zoom_level?: unknown;
    minZoomLevel?: unknown;
    min_zoom_level?: unknown;
  } | undefined;

  if (!tableAny) return 13;

  const rawTileZoom =
    tableAny.tileZoomLevel ??
    tableAny.tile_zoom_level ??
    tableAny.minZoomLevel ??
    tableAny.min_zoom_level;
  const tileZoom = Number(rawTileZoom);
  return Number.isFinite(tileZoom) ? tileZoom : 13;
}
