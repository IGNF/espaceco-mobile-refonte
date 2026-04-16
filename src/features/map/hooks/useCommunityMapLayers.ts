import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import { CollabVectorLayer, type CommunityLayer } from '@ign/mobile-core';
import type { OfflineCommunityCache, OfflineMode } from '@/domain/offline/models';
import type Map from 'ol/Map';
import type BaseLayer from 'ol/layer/Base';
import type LayerGroup from 'ol/layer/Group';
import { collabApiClient } from '@/infra/api/collabApiClient';
import { findLayerGroupByName } from '@/infra/map/openlayers/layerGroups';
import { getCommunityLayerKeyFromOlLayer } from '@/infra/map/openlayers/layerMetadata';
import {
  createCommunityVectorLayer,
} from '@/infra/map/openlayers/vectorLayers';
import { createCommunityGeoportailLayers } from '@/infra/map/openlayers/geoportailLayers';
import { getCommunityLayerKey } from '@/shared/utils/layerKey';
import { getCommunityLayerTitle } from '@/shared/utils/communityLayer';

interface UseCommunityMapLayersResult {
  isVectorLayersLoading: boolean;
}

function syncLayerDisplayState(
  olLayer: BaseLayer,
  layer: CommunityLayer
): void {
  if (typeof layer.visible === 'boolean') {
    olLayer.setVisible(layer.visible);
  }

  if (typeof layer.opacity === 'number') {
    olLayer.setOpacity(layer.opacity);
  }
}

function areSameOrderedLayers(
  currentLayers: BaseLayer[],
  desiredLayers: BaseLayer[]
): boolean {
  if (currentLayers.length !== desiredLayers.length) {
    return false;
  }

  return currentLayers.every(
    (layer, index) => layer === desiredLayers[index]
  );
}

function replaceLayerGroupContent(
  layerGroup: LayerGroup,
  orderedLayers: BaseLayer[]
): void {
  layerGroup.getLayers().clear();

  for (const layer of orderedLayers) {
    layerGroup.getLayers().push(layer);
  }
}

function syncCommunityVectorLayerGroup(
  layerGroup: LayerGroup,
  vectorLayers: CommunityLayer[],
  isOfflineMode: boolean,
  activeCommunityCache: OfflineCommunityCache | null
): void {
  const existingLayersByKey = new globalThis.Map<string, BaseLayer>();

  for (const layer of layerGroup.getLayers().getArray()) {
    const layerKey = getCommunityLayerKeyFromOlLayer(layer);
    if (layerKey) {
      existingLayersByKey.set(layerKey, layer);
    }
  }

  const orderedLayers: BaseLayer[] = [];

  for (const communityLayer of vectorLayers) {
    const layerKey = getCommunityLayerKey(communityLayer);
    const offlineCacheLayer = activeCommunityCache?.layers.find(
      (cacheLayer) => cacheLayer.layerKey === layerKey
    );
    const desiredCacheNamespace = isOfflineMode
      ? offlineCacheLayer?.cacheNamespace
      : undefined;
    const desiredRuntimeMode = isOfflineMode ? 'offline' : 'online';
    let olLayer: BaseLayer | null | undefined = existingLayersByKey.get(layerKey);

    const canReuseLayer =
      olLayer &&
      (!(olLayer instanceof CollabVectorLayer) ||
        (
          olLayer.get('offlineRuntimeMode') === desiredRuntimeMode &&
          (olLayer.get('offlineCacheNamespace') ?? null) === (desiredCacheNamespace ?? null)
        ));

    if (!canReuseLayer) {
      olLayer = createCommunityVectorLayer(
        communityLayer,
        collabApiClient,
        isOfflineMode,
        desiredCacheNamespace
      );
    }

    if (!olLayer) {
      continue;
    }

    syncLayerDisplayState(olLayer, communityLayer);

    orderedLayers.push(olLayer);
  }

  const currentLayers = layerGroup.getLayers().getArray();

  if (!areSameOrderedLayers(currentLayers, orderedLayers)) {
    replaceLayerGroupContent(layerGroup, orderedLayers);
  }
}

/**
 * Syncs enriched community layers to the map's layer groups:
 * - Geoportail WMTS layers go into the "groupe" group
 * - Vector layers (WFS + table-based) go into the "guichet" group
 */
export function useCommunityMapLayers(
  mapRef: RefObject<Map | null>,
  geoportailLayers: CommunityLayer[],
  vectorLayers: CommunityLayer[],
  isMapReady: boolean,
  mode: OfflineMode,
  activeCommunityCache: OfflineCommunityCache | null
): UseCommunityMapLayersResult {
  const [isVectorLayersLoading, setIsVectorLayersLoading] = useState(false);
  const isOfflineMode = mode === 'offline';

  useEffect(() => {
    if (!isMapReady) return;

    const map = mapRef.current;
    if (!map) return;

    const groupe = findLayerGroupByName(map, 'groupe');
    if (!groupe) return;

    replaceLayerGroupContent(
      groupe,
      createCommunityGeoportailLayers(geoportailLayers)
    );
  }, [geoportailLayers, isMapReady, mapRef]);

  useEffect(() => {
    if (!isMapReady) return;

    const map = mapRef.current;
    if (!map) return;

    const guichet = findLayerGroupByName(map, 'guichet');
    if (!guichet) return;

    syncCommunityVectorLayerGroup(
      guichet,
      vectorLayers,
      isOfflineMode,
      activeCommunityCache
    );
  }, [activeCommunityCache, isMapReady, isOfflineMode, mapRef, vectorLayers]);

  useEffect(() => {
    if (!isMapReady) return;

    const map = mapRef.current;
    if (!map) return;

    const guichet = findLayerGroupByName(map, 'guichet');
    if (!guichet) return;

    const loadingByLayerKey: Record<string, boolean> = {};
    const cleanupTasks: Array<() => void> = [];
    const layerTitleByKey = new globalThis.Map(
      vectorLayers.map((layer) => [getCommunityLayerKey(layer), getCommunityLayerTitle(layer)])
    );

    const setLayerLoadingState = (layerKey: string, isLoading: boolean) => {
      if (isLoading) {
        loadingByLayerKey[layerKey] = true;
      } else {
        delete loadingByLayerKey[layerKey];
      }

      setIsVectorLayersLoading(Object.keys(loadingByLayerKey).length > 0);
    };

    for (const layer of guichet.getLayers().getArray()) {
      const layerKey = getCommunityLayerKeyFromOlLayer(layer);
      const layerTitle = layerKey ? layerTitleByKey.get(layerKey) ?? layerKey : '';
      const loadSource =
        isOfflineMode && layer instanceof CollabVectorLayer ? 'offline cache' : 'api';

      /**
       * BaseLayer does not expose getSource() in its public type, but the mounted vector layers do.
       * Narrow it locally so we can subscribe to the load events used by the global map spinner.
       */
      const source = (
        layer as BaseLayer & {
          getSource?: () => {
            on(type: 'loadstart' | 'loadend', listener: (event: unknown) => void): void;
            un(type: 'loadstart' | 'loadend', listener: (event: unknown) => void): void;
          } | null | undefined;
        }
      ).getSource?.();

      if (!layerKey || !source) {
        continue;
      }

      const handleLoadStart = () => {
        console.log('[OFFLINE_MODE][useCommunityMapLayers] layer load start', {
          layerKey,
          layerTitle,
          source: loadSource,
        });
        setLayerLoadingState(layerKey, true);
      };

      const handleLoadEnd = (event: unknown) => {
        const remains = (event as { remains?: unknown } | undefined)?.remains;
        console.log('[OFFLINE_MODE][useCommunityMapLayers] layer load end', {
          layerKey,
          layerTitle,
          source: loadSource,
          remains,
        });
        setLayerLoadingState(layerKey, typeof remains === 'number' ? remains > 0 : false);
      };

      source.on('loadstart', handleLoadStart);
      source.on('loadend', handleLoadEnd);
      cleanupTasks.push(() => {
        source.un('loadstart', handleLoadStart);
        source.un('loadend', handleLoadEnd);
      });
    }

    return () => {
      for (const cleanup of cleanupTasks) {
        cleanup();
      }

      setIsVectorLayersLoading(false);
    };
  }, [isMapReady, isOfflineMode, mapRef, vectorLayers]);

  return {
    isVectorLayersLoading,
  };
}
