import type { CacheMetadata, CommunityLayer } from '@ign/mobile-core';
import { mapApiLayerToCommunityLayer } from '@/domain/community/layerMappers';
import { cacheStorage } from '@/infra/storage/cacheStorage';
import { LAYER_CACHE_KEY_PREFIX, LAYER_CACHE_TTL_MS } from '@/shared/constants/map';

export interface LayerCacheEntry {
  layers: CommunityLayer[];
  cachedAt: number;
}

interface LayerCacheMetadataExtra {
  communityId: number;
  cachedAt: number;
  layers: unknown[];
}

const memoryLayerCache = new Map<number, LayerCacheEntry>();

function cloneLayers(layers: CommunityLayer[]): CommunityLayer[] {
  return JSON.parse(JSON.stringify(layers)) as CommunityLayer[];
}

function getLayerCacheKey(communityId: number): string {
  return `${LAYER_CACHE_KEY_PREFIX}${communityId}`;
}

export function isLayerCacheFresh(cachedAt: number): boolean {
  return Date.now() - cachedAt <= LAYER_CACHE_TTL_MS;
}

function getMemoryLayerCacheEntry(communityId: number): LayerCacheEntry | null {
  const cacheEntry = memoryLayerCache.get(communityId);
  if (!cacheEntry) return null;

  return {
    layers: cloneLayers(cacheEntry.layers),
    cachedAt: cacheEntry.cachedAt,
  };
}

async function getPersistentLayerCacheEntry(
  communityId: number
): Promise<LayerCacheEntry | null> {
  try {
    const cacheKey = getLayerCacheKey(communityId);
    const metadata = await cacheStorage.getMetadata(cacheKey);
    if (!metadata) return null;

    const extra = metadata.extra as LayerCacheMetadataExtra | undefined;
    const rawLayers = Array.isArray(extra?.layers) ? extra.layers : [];
    const cachedAt = Number(
      extra?.cachedAt ?? metadata.modified?.getTime() ?? metadata.created?.getTime()
    );
    if (!Number.isFinite(cachedAt) || cachedAt <= 0) return null;

    const layers = rawLayers.map((layer) => mapApiLayerToCommunityLayer(layer));
    return {
      layers,
      cachedAt,
    };
  } catch (error) {
    console.warn(
      `[Layers] Failed to read cache for community ${communityId}:`,
      error
    );
    return null;
  }
}

function getMostRecentCacheEntry(
  memoryEntry: LayerCacheEntry | null,
  persistentEntry: LayerCacheEntry | null
): LayerCacheEntry | null {
  if (!memoryEntry) return persistentEntry;
  if (!persistentEntry) return memoryEntry;
  return memoryEntry.cachedAt >= persistentEntry.cachedAt
    ? memoryEntry
    : persistentEntry;
}

export async function getLayerCacheEntry(
  communityId: number
): Promise<LayerCacheEntry | null> {
  const memoryEntry = getMemoryLayerCacheEntry(communityId);
  const persistentEntry = await getPersistentLayerCacheEntry(communityId);
  const selectedEntry = getMostRecentCacheEntry(memoryEntry, persistentEntry);

  if (selectedEntry) {
    memoryLayerCache.set(communityId, {
      layers: cloneLayers(selectedEntry.layers),
      cachedAt: selectedEntry.cachedAt,
    });
  }

  return selectedEntry;
}

export async function saveLayerCacheEntry(
  communityId: number,
  layers: CommunityLayer[]
): Promise<void> {
  const now = Date.now();
  const clonedLayers = cloneLayers(layers);
  const cacheKey = getLayerCacheKey(communityId);
  const metadata: CacheMetadata = {
    id: cacheKey,
    name: `Community layers ${communityId}`,
    type: 'vector',
    created: new Date(now),
    modified: new Date(now),
    size: JSON.stringify(clonedLayers).length,
    featureCount: clonedLayers.length,
    extra: {
      communityId,
      cachedAt: now,
      layers: clonedLayers,
    },
  };

  memoryLayerCache.set(communityId, {
    layers: clonedLayers,
    cachedAt: now,
  });

  try {
    await cacheStorage.saveMetadata(cacheKey, metadata);
  } catch (error) {
    console.warn(
      `[Layers] Failed to persist cache for community ${communityId}:`,
      error
    );
  }
}
