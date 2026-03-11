import type BaseLayer from 'ol/layer/Base';
import type { ApiClient } from 'collaboratif-client-api';
import {
  CollabVectorLayer,
  WFSLayer,
  type CommunityLayer
} from '@ign/mobile-core';
import { applyCommunityLayerMetadata } from '@/infra/map/directContribution/DirectContributionLayerService';
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
    const wfsLayer = new WFSLayer({
      geoservice,
      visibility: getLayerVisibility(layer),
      opacity: getLayerOpacity(layer),
      useCacheWhenOnline: USE_LAYER_FEATURE_CACHE_WHEN_ONLINE,
    } as any, cacheStorage as any);
    // Keep a link back to the originating CommunityLayer for layer-panel actions.
    applyCommunityLayerMetadata(wfsLayer, layer);
    return wfsLayer;
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

    // Direct contribution actions resolve the live OL layer from this metadata.
    applyCommunityLayerMetadata(collabLayer, layer);
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
  const table = layer.table;
  if (!table || typeof table !== 'object') return undefined;

  if (typeof table.wfs === 'string' && table.wfs.length > 0) {
    return table.wfs;
  }

  return undefined;
}

function getTableTileZoom(layer: CommunityLayer): number {
  const table = layer.table;

  if (!table || typeof table !== 'object') return 13;

  // Match the legacy collaborative-layer rule: use the explicit table tile zoom.
  const tileZoom = Number(table.tileZoomLevel);
  return Number.isFinite(tileZoom) ? tileZoom : 13;
}
