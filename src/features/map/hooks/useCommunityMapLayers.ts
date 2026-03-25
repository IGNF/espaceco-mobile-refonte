import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import type { CommunityLayer } from '@ign/mobile-core';
import type Map from 'ol/Map';
import type BaseLayer from 'ol/layer/Base';
import type LayerGroup from 'ol/layer/Group';
import { collabApiClient } from '@/infra/api/collabApiClient';
import {
  createCommunityVectorLayer,
} from '@/infra/map/openlayers/vectorLayers';
import { createCommunityGeoportailLayers } from '@/infra/map/openlayers/geoportailLayers';
import {
  COMMUNITY_LAYER_KEY_PROPERTY,
} from '@/infra/map/directContribution/DirectContributionLayerService';
import { getCommunityLayerKey } from '@/shared/utils/layerKey';

interface UseCommunityMapLayersResult {
  isVectorLayersLoading: boolean;
}

interface ObservableLayerSource {
  on(type: string, listener: (event: unknown) => void): void;
  un(type: string, listener: (event: unknown) => void): void;
}

function findLayerGroup(map: Map, name: string): LayerGroup | undefined {
  return map
    .getLayers()
    .getArray()
    .find(
      (layer) => layer.get('name') === name
    ) as LayerGroup | undefined;
}

function getCommunityLayerKeyFromOlLayer(layer: BaseLayer): string | undefined {
  const rawLayerKey = layer.get(COMMUNITY_LAYER_KEY_PROPERTY);

  return typeof rawLayerKey === 'string' && rawLayerKey.length > 0
    ? rawLayerKey
    : undefined;
}

function getObservableLayerSource(layer: BaseLayer): ObservableLayerSource | null {
  const source = (
    layer as BaseLayer & {
      getSource?: () => ObservableLayerSource | null | undefined;
    }
  ).getSource?.();

  return source ?? null;
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
  vectorLayers: CommunityLayer[]
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
    let olLayer: BaseLayer | null | undefined = existingLayersByKey.get(layerKey);

    if (!olLayer) {
      olLayer = createCommunityVectorLayer(communityLayer, collabApiClient);
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
  isMapReady: boolean
): UseCommunityMapLayersResult {
  const [isVectorLayersLoading, setIsVectorLayersLoading] = useState(false);

  useEffect(() => {
    if (!isMapReady) return;

    const map = mapRef.current;
    if (!map) return;

    const groupe = findLayerGroup(map, 'groupe');
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

    const guichet = findLayerGroup(map, 'guichet');
    if (!guichet) return;

    syncCommunityVectorLayerGroup(guichet, vectorLayers);
  }, [isMapReady, mapRef, vectorLayers]);

  useEffect(() => {
    if (!isMapReady) return;

    const map = mapRef.current;
    if (!map) return;

    const guichet = findLayerGroup(map, 'guichet');
    if (!guichet) return;

    const loadingByLayerKey: Record<string, boolean> = {};
    const cleanupTasks: Array<() => void> = [];

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
      const source = getObservableLayerSource(layer);
      if (!layerKey || !source) {
        continue;
      }

      const handleLoadStart = () => {
        setLayerLoadingState(layerKey, true);
      };

      const handleLoadEnd = (event: unknown) => {
        const remains = (event as { remains?: unknown } | undefined)?.remains;
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
  }, [isMapReady, mapRef, vectorLayers]);

  return {
    isVectorLayersLoading,
  };
}
