import { useMemo } from 'react';

import type { CommunityLayer } from '@ign/mobile-core';

import { getCommunityLayerKey } from '@/shared/utils/layerKey';

interface UseMountedCommunityVectorLayersParams {
  vectorLayers: CommunityLayer[];
  pendingChangesCountByLayerKey: Record<string, number>;
  activeLayer: CommunityLayer | null;
}

/**
 * Keeps hidden collaborative layers out of the map while preserving the ones that are currently edited or already contain a local draft.
 */
export function useMountedCommunityVectorLayers({
  vectorLayers,
  pendingChangesCountByLayerKey,
  activeLayer,
}: UseMountedCommunityVectorLayersParams): CommunityLayer[] {
  const activeLayerKey = useMemo(() => {
    if (!activeLayer) {
      return null;
    }

    return getCommunityLayerKey(activeLayer);
  }, [activeLayer]);

  return useMemo(() => {
    return vectorLayers.filter((layer) => {
      const layerKey = getCommunityLayerKey(layer);
      const isVisible = layer.visible !== false;
      const hasPendingChanges =
        (pendingChangesCountByLayerKey[layerKey] ?? 0) > 0;
      const isActiveDirectContributionLayer = layerKey === activeLayerKey;

      return isVisible || hasPendingChanges || isActiveDirectContributionLayer;
    });
  }, [activeLayerKey, pendingChangesCountByLayerKey, vectorLayers]);
}
