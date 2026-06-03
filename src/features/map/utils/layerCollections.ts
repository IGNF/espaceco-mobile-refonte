import type { CommunityLayer } from '@ign/mobile-core';

import { getCommunityLayerKey } from '@/shared/utils/layerKey';

export function uniqueCommunityLayersByKey(
  layers: CommunityLayer[]
): CommunityLayer[] {
  const layerKeys = new Set<string>();
  const result: CommunityLayer[] = [];

  for (const layer of layers) {
    const layerKey = getCommunityLayerKey(layer);
    if (layerKeys.has(layerKey)) {
      continue;
    }

    layerKeys.add(layerKey);
    result.push(layer);
  }

  return result;
}

export function filterMesCartesLayers(
  layers: CommunityLayer[],
  geoportailLayers: CommunityLayer[],
  vectorLayers: CommunityLayer[]
): CommunityLayer[] {
  const excludedLayers = new Set([...geoportailLayers, ...vectorLayers]);

  return uniqueCommunityLayersByKey(
    layers.filter((layer) => !excludedLayers.has(layer))
  );
}
