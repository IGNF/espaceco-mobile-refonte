import type BaseLayer from 'ol/layer/Base';
import type { ApiClient } from 'collaboratif-client-api';
import {
  CollabVectorLayer,
  WFSLayer,
  type CommunityLayer,
} from '@ign/mobile-core';
import { applyCommunityLayerMetadata } from '@/infra/map/openlayers/layerMetadata';
import { stripQueryParams } from '@/shared/utils/query';
import { cacheStorage } from '@/infra/storage/cacheStorage';

/**
 * Builds the runtime OpenLayers layer used on the map from a community-layer definition.
 * Collaborative layers start directly in online or offline mode depending on the current app mode.
 */
export function createCommunityVectorLayer(
  layer: CommunityLayer,
  apiClient: ApiClient,
  isOfflineMode: boolean,
  cacheNamespace?: string
): BaseLayer | null {
  const geoservice = layer.geoservice;
  if (geoservice && (geoservice.type as string)?.toUpperCase() === 'WFS') {
    const wfsLayer = new WFSLayer({
      geoservice,
      visibility: getLayerVisibility(layer),
      opacity: getLayerOpacity(layer),
      useCacheWhenOnline: false,
    } as any, cacheStorage as any);
    // Keep a link back to the originating CommunityLayer for layer-panel actions.
    applyCommunityLayerMetadata(wfsLayer, layer);
    return wfsLayer;
  }

  const wfsUrl = getTableWfsUrl(layer);
  if (layer.table && wfsUrl) {
    const table = layer.table;
    const cacheUrl = `${layer.database ?? table.database ?? ''}:${table.name}`;

    const collabLayer = new CollabVectorLayer(
      {
        database: String(layer.database ?? table.database ?? ''),
        name: table.name,
        url: stripQueryParams(wfsUrl),
        client: apiClient,
        table,
        cacheUrl,
        cacheNamespace,
        legacyCacheFallback: !isOfflineMode,
      },
      {
        tileZoom: getTableTileZoom(layer),
        maxFeatures: getLayerMaxFeatures(layer),
        online: !isOfflineMode,
        outputFormat: getLayerOutputFormat(layer),
        useCacheWhenOnline: false,
        cache: cacheStorage,
        legacyCacheFallback: !isOfflineMode,
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

    // Direct contribution actions resolve the live OL layer from this metadata.
    applyCommunityLayerMetadata(collabLayer, layer);
    collabLayer.set('offlineRuntimeMode', isOfflineMode ? 'offline' : 'online');
    collabLayer.set('offlineCacheNamespace', cacheNamespace ?? null);
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

export function getTableWfsUrl(layer: CommunityLayer): string | undefined {
  const table = layer.table;
  if (!table || typeof table !== 'object') return undefined;

  if (typeof table.wfs === 'string' && table.wfs.length > 0) {
    return table.wfs;
  }

  return undefined;
}

export function getTableTileZoom(layer: CommunityLayer): number {
  const table = layer.table;

  if (!table || typeof table !== 'object') return 13;

  // Match the legacy collaborative-layer rule: use the explicit table tile zoom.
  const tileZoom = Number(table.tileZoomLevel);
  return Number.isFinite(tileZoom) ? tileZoom : 13;
}

export function getLayerMaxFeatures(layer: CommunityLayer): number {
  const tileZoom = getTableTileZoom(layer);

  // Lower-zoom collaborative tiles cover a much larger area, so a smaller cap keeps slow environments responsive.
  if (tileZoom <= 12) {
    return 1000;
  }

  if (tileZoom <= 14) {
    return 2000;
  }

  return 5000;
}

export function getLayerOutputFormat(
  layer: CommunityLayer
): 'CSV' | 'JSON' | undefined {
  return layer.format === 'CSV' || layer.format === 'JSON'
    ? layer.format
    : undefined;
}
