import type { CommunityLayer } from '@ign/mobile-core';
import {
  mapApiGeoservice,
  mapApiLayerToCommunityLayer,
  mapApiTable,
} from '@/domain/community/layerMappers';
import {
  getLayerCacheEntry,
  isLayerCacheFresh,
  saveLayerCacheEntry,
} from '@/infra/api/layerCache';
import { collabApiClient } from './collabApiClient';

interface FetchCommunityLayersOptions {
  forceRefresh?: boolean;
}

type LayerEnrichment =
  | { type: 'geoservice'; data: CommunityLayer['geoservice'] }
  | { type: 'table'; data: CommunityLayer['table'] }
  | null;

/**
 * Fetch community layers and enrich them with geoservice data, table data and database extents.
 */
export async function fetchCommunityLayers(
  communityId: number,
  options: FetchCommunityLayersOptions = {}
): Promise<CommunityLayer[]> {
  const { forceRefresh = false } = options;
  const cachedEntry = await getLayerCacheEntry(communityId);

  if (!forceRefresh && cachedEntry && isLayerCacheFresh(cachedEntry.cachedAt)) {
    return cachedEntry.layers;
  }

  try {
    const layers = await fetchAndEnrichCommunityLayers(communityId);
    await saveLayerCacheEntry(communityId, layers);
    return layers;
  } catch (error) {
    if (cachedEntry) {
      console.warn(
        `[Layers] Failed to refresh community ${communityId}, using cached data instead.`
      );
      return cachedEntry.layers;
    }
    throw error;
  }
}

async function fetchAndEnrichCommunityLayers(
  communityId: number
): Promise<CommunityLayer[]> {
  const response = await collabApiClient.layer.getAll(communityId, {
    limit: 100,
  });
  const layers: CommunityLayer[] = (response.data ?? []).map((layer: unknown) =>
    mapApiLayerToCommunityLayer(layer)
  );

  const uniqueDatabaseIds = getUniqueDatabaseIds(layers);
  const [databaseExtentsMap, enrichedData] = await Promise.all([
    fetchDatabaseExtents(uniqueDatabaseIds),
    Promise.all(layers.map((layer) => fetchLayerData(layer))),
  ]);

  enrichLayers(layers, enrichedData, databaseExtentsMap);
  return layers;
}

/**
 * Fetch geoservice or table data for a single layer.
 */
async function fetchLayerData(layer: CommunityLayer): Promise<LayerEnrichment> {
  const geoserviceId = getLayerGeoserviceId(layer);
  if (geoserviceId !== null) {
    try {
      const geoserviceResponse = await collabApiClient.geoservice.get(geoserviceId);
      return {
        type: 'geoservice',
        data: mapApiGeoservice(geoserviceResponse.data),
      };
    } catch {
      return null;
    }
  }

  const tableId = getLayerTableId(layer);
  const databaseId = getLayerDatabaseId(layer);
  if (tableId !== null && databaseId !== null) {
    try {
      const tableResponse = await collabApiClient.table.get(databaseId, tableId);
      return { type: 'table', data: mapApiTable(tableResponse.data) };
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Extract unique database IDs from layers that have table data.
 */
function getUniqueDatabaseIds(layers: CommunityLayer[]): number[] {
  const databaseIds = new Set<number>();

  for (const layer of layers) {
    const tableId = getLayerTableId(layer);
    const databaseId = getLayerDatabaseId(layer);
    if (tableId !== null && databaseId !== null) {
      databaseIds.add(databaseId);
    }
  }

  return Array.from(databaseIds);
}

/**
 * Fetch database extents for all database IDs.
 */
async function fetchDatabaseExtents(
  databaseIds: number[]
): Promise<Record<number, string>> {
  if (databaseIds.length === 0) {
    return {};
  }

  const databasePromises = databaseIds.map((databaseId) =>
    collabApiClient.database.get(databaseId, { fields: 'extent,id' })
  );
  const databaseResponses = await Promise.all(databasePromises);

  const extentsMap: Record<number, string> = {};
  for (const response of databaseResponses) {
    const databaseId = Number(response.data?.id);
    if (Number.isFinite(databaseId) && typeof response.data?.extent === 'string') {
      extentsMap[databaseId] = response.data.extent;
    }
  }

  return extentsMap;
}

/**
 * Enrich layers with fetched geoservice/table data and database extents.
 */
function enrichLayers(
  layers: CommunityLayer[],
  enrichedData: LayerEnrichment[],
  databaseExtentsMap: Record<number, string>
): void {
  for (let index = 0; index < layers.length; index++) {
    const layer = layers[index];
    const data = enrichedData[index];
    if (!data) continue;

    if (data.type === 'geoservice') {
      layer.geoservice = data.data;
      continue;
    }

    layer.table = data.data;
    const databaseId = getLayerDatabaseId(layer);
    if (databaseId !== null && databaseExtentsMap[databaseId]) {
      layer.extent = databaseExtentsMap[databaseId].split(',');
    }
  }
}

function getLayerReferenceId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (value && typeof value === 'object') {
    const id = Number((value as { id?: unknown }).id);
    if (Number.isFinite(id)) {
      return id;
    }
  }

  return null;
}

function getLayerGeoserviceId(layer: CommunityLayer): number | null {
  return getLayerReferenceId((layer as { geoservice?: unknown }).geoservice);
}

function getLayerTableId(layer: CommunityLayer): number | null {
  return getLayerReferenceId((layer as { table?: unknown }).table);
}

function getLayerDatabaseId(layer: CommunityLayer): number | null {
  const databaseId = Number(layer.database);
  return Number.isFinite(databaseId) ? databaseId : null;
}

/**
 * Filter enriched layers to only keep Geoportail WMTS layers.
 */
export function filterGeoportailLayers(layers: CommunityLayer[]): CommunityLayer[] {
  return layers.filter((layer) => {
    const geoservice = layer.geoservice;
    if (!geoservice) return false;

    // API can return 'WMTS' even though the library type only declares 'WFS' | 'WMS'
    const isWmts = (geoservice.type as string) === 'WMTS';
    const isGeoportail =
      geoservice.url?.includes('geoportail') || geoservice.url?.includes('data.geopf');

    return isWmts && isGeoportail;
  });
}

/**
 * Filter enriched layers to only keep vector layers
 * (WFS geoservices or table-based with WFS endpoint).
 */
export function filterVectorLayers(layers: CommunityLayer[]): CommunityLayer[] {
  return layers.filter((layer) => {
    if (layer.geoservice?.type === 'WFS') return true;
    return Boolean(layer.table?.wfs);
  });
}
