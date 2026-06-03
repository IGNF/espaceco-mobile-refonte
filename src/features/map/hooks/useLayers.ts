import { useState, useEffect, useMemo, useCallback } from 'react';

import type { CommunityLayer } from '@ign/mobile-core';

import type { OfflineCommunityCache, OfflineMode } from '@/domain/offline/models';
import {
  fetchCommunityLayers,
  filterGeoportailLayers,
  filterVectorLayers,
} from '@/infra/api/layerService';

import { useCommunity } from '@/features/community/hooks/useCommunity';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  type SignalementLayerOpacity,
  type SignalementLayerState,
  DEFAULT_SIGNALEMENT_LAYER_ORDER,
  DEFAULT_SIGNALEMENT_LAYER_VISIBILITY,
  isSignalementLayerKey,
  normalizeSignalementLayerOrder,
} from '@/features/map/constants/signalementLayers.constants';
import type {
  LayerDisplayState,
  LayerGroupId,
  LayerGroupVisibility,
} from '@/features/map/types/layerGroups';
import {
  loadLayersConfiguration,
  saveLayersConfiguration,
  type LayersConfiguration,
} from '@/features/map/services/layersConfigurationStorage';
import {
  createUserWmsLayer,
  fetchRemoteWmsLayers,
  getUserWmsLayerIdFromCommunityLayer,
  userWmsLayerToCommunityLayer,
} from '@/features/map/services/userWmsLayers';
import type {
  RemoteWmsLayer,
  UserWmsLayer,
} from '@/features/map/types/userWmsLayers';
import {
  orderItemsByStringKey,
  uniqueOrderedStrings,
} from '@/features/map/utils/order';
import { filterMesCartesLayers } from '@/features/map/utils/layerCollections';

import { clampNumber } from '@/shared/utils/number';
import { getCommunityLayerKey } from '@/shared/utils/layerKey';
import { getCommunityLayerTitle } from '@/shared/utils/communityLayer';
import { DEFAULT_SIGNALEMENT_LAYER_OPACITY } from '@/features/map/constants/signalementLayers.constants';
import {
  DEFAULT_GEOPORTAIL_LAYER_OPACITY,
  DEFAULT_GEOPORTAIL_LAYER_VISIBILITY,
  DEFAULT_LAYER_GROUP_VISIBILITY,
  isDefaultGeoportailLayerName,
} from '@/shared/constants/map';
import { applyLayerStyleSelection } from '@/features/map/utils/layerStyles';

function getDefaultSignalementLayerOpacity(): SignalementLayerOpacity {
  return { ...DEFAULT_SIGNALEMENT_LAYER_OPACITY };
}

function getDefaultSignalementLayerState(): SignalementLayerState {
  return {
    visibility: { ...DEFAULT_SIGNALEMENT_LAYER_VISIBILITY },
    opacity: getDefaultSignalementLayerOpacity(),
    order: [...DEFAULT_SIGNALEMENT_LAYER_ORDER],
  };
}

function getDefaultGeoportailLayerState(): LayerDisplayState {
  return {
    visibility: { ...DEFAULT_GEOPORTAIL_LAYER_VISIBILITY },
    opacity: { ...DEFAULT_GEOPORTAIL_LAYER_OPACITY },
  };
}

function getDefaultLayerGroupVisibility(): LayerGroupVisibility {
  return { ...DEFAULT_LAYER_GROUP_VISIBILITY };
}

function getGeoportailLayerName(layer: CommunityLayer): string | null {
  return layer.geoservice?.layers ?? null;
}

function applyDefaultGeoportailLayerState(
  layers: CommunityLayer[],
  geoportailLayerState: LayerDisplayState
): CommunityLayer[] {
  return layers.map((layer) => {
    const layerName = getGeoportailLayerName(layer);
    if (!layerName || !isDefaultGeoportailLayerName(layerName)) {
      return layer;
    }

    return {
      ...layer,
      visible: geoportailLayerState.visibility[layerName] ?? layer.visible,
      opacity: geoportailLayerState.opacity[layerName] ?? layer.opacity,
    };
  });
}

function reorderLayersByLayerOrder(
  layers: CommunityLayer[],
  layerOrder: string[]
): CommunityLayer[] {
  const normalizedLayerOrder = uniqueOrderedStrings(layerOrder);
  if (normalizedLayerOrder.length === 0) {
    return layers;
  }

  return orderItemsByStringKey(layers, getCommunityLayerKey, normalizedLayerOrder);
}

function reorderLayersWithinSubset(
  layers: CommunityLayer[],
  orderedSubsetLayerKeys: string[]
): CommunityLayer[] {
  const normalizedSubsetOrder = uniqueOrderedStrings(orderedSubsetLayerKeys);
  if (normalizedSubsetOrder.length === 0) {
    return layers;
  }

  const subsetLayerKeySet = new Set(normalizedSubsetOrder);
  const subsetLayers = layers.filter((layer) =>
    subsetLayerKeySet.has(getCommunityLayerKey(layer))
  );
  const reorderedSubsetLayers = orderItemsByStringKey(
    subsetLayers,
    getCommunityLayerKey,
    normalizedSubsetOrder
  );

  let reorderedSubsetIndex = 0;

  return layers.map((layer) => {
    const layerKey = getCommunityLayerKey(layer);
    if (!subsetLayerKeySet.has(layerKey)) {
      return layer;
    }

    const reorderedLayer = reorderedSubsetLayers[reorderedSubsetIndex];
    reorderedSubsetIndex += 1;
    return reorderedLayer ?? layer;
  });
}

function applySavedLayerConfiguration(
  layers: CommunityLayer[],
  savedConfiguration: LayersConfiguration | null
): {
  layers: CommunityLayer[];
  lockedByLayerKey: Record<string, boolean>;
} {
  const lockedByLayerKey: Record<string, boolean> = {};

  const configuredLayers = layers.map((layer) => {
    const layerKey = getCommunityLayerKey(layer);
    const savedLayerState = savedConfiguration?.layersByKey[layerKey];
    if (!savedLayerState) {
      return layer;
    }

    if (savedLayerState.locked === true) {
      lockedByLayerKey[layerKey] = true;
    }

    const styledLayer = savedLayerState.styleId
      ? applyLayerStyleSelection(layer, savedLayerState.styleId)
      : layer;

    return {
      ...styledLayer,
      visible: savedLayerState.visible ?? layer.visible,
      opacity: savedLayerState.opacity ?? layer.opacity,
    };
  });

  return {
    layers: reorderLayersByLayerOrder(
      configuredLayers,
      savedConfiguration?.layerOrder ?? []
    ),
    lockedByLayerKey,
  };
}

export function useLayers(
  mode: OfflineMode,
  activeCommunityCache: OfflineCommunityCache | null
) {
  const { user } = useAuth();
  const { activeCommunity } = useCommunity();
  const activeCommunityId = activeCommunity?.id;
  const userId = user?.id ?? null;
  const [layers, setLayers] = useState<CommunityLayer[]>([]);
  const [userWmsLayers, setUserWmsLayers] = useState<UserWmsLayer[]>([]);
  const [signalementLayerState, setSignalementLayerState] =
    useState<SignalementLayerState>(() => getDefaultSignalementLayerState());
  const [geoportailLayerState, setGeoportailLayerState] =
    useState<LayerDisplayState>(() => getDefaultGeoportailLayerState());
  const [groupVisibility, setGroupVisibility] =
    useState<LayerGroupVisibility>(() => getDefaultLayerGroupVisibility());
  const [lockedByLayerKey, setLockedByLayerKey] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydratedCommunityId, setHydratedCommunityId] = useState<number | null>(null);
  const [hydratedUserId, setHydratedUserId] = useState<number | null>(null);
  const [hydratedMode, setHydratedMode] = useState<OfflineMode | null>(null);

  const resetLayerPreferences = useCallback(() => {
    setSignalementLayerState(getDefaultSignalementLayerState());
    setGeoportailLayerState(getDefaultGeoportailLayerState());
    setGroupVisibility(getDefaultLayerGroupVisibility());
    setLockedByLayerKey({});
  }, []);

  const geoportailLayers = useMemo(() => filterGeoportailLayers(layers), [layers]);
  const vectorLayers = useMemo(() => filterVectorLayers(layers), [layers]);
  const mesCartesLayers = useMemo(
    () => filterMesCartesLayers(layers, geoportailLayers, vectorLayers),
    [geoportailLayers, layers, vectorLayers]
  );

  const updateUserWmsLayerState = useCallback((
    layerKey: string,
    update: (layer: UserWmsLayer) => UserWmsLayer
  ) => {
    setUserWmsLayers((previous) =>
      previous.map((userLayer) => {
        const communityLayer = userWmsLayerToCommunityLayer(userLayer);
        return getCommunityLayerKey(communityLayer) === layerKey
          ? update(userLayer)
          : userLayer;
      })
    );
  }, []);

  const setLayerVisibility = useCallback((layerKey: string, visible: boolean) => {
    if (isSignalementLayerKey(layerKey)) {
      setSignalementLayerState((previous) => ({
        ...previous,
        visibility: {
          ...previous.visibility,
          [layerKey]: visible,
        },
      }));
      return;
    }

    if (isDefaultGeoportailLayerName(layerKey)) {
      setGeoportailLayerState((previous) => ({
        ...previous,
        visibility: {
          ...previous.visibility,
          [layerKey]: visible,
        },
      }));
      setLayers((previous) =>
        previous.map((layer) =>
          getGeoportailLayerName(layer) === layerKey ? { ...layer, visible } : layer
        )
      );
      return;
    }

    setLayers((previous) =>
      previous.map((layer) =>
        getCommunityLayerKey(layer) === layerKey ? { ...layer, visible } : layer
      )
    );
    updateUserWmsLayerState(layerKey, (layer) => ({ ...layer, visible }));
  }, [updateUserWmsLayerState]);

  const setLayerOpacity = useCallback((layerKey: string, opacity: number) => {
    const nextOpacity = clampNumber(opacity, 0, 1);

    if (isSignalementLayerKey(layerKey)) {
      setSignalementLayerState((previous) => ({
        ...previous,
        opacity: {
          ...previous.opacity,
          [layerKey]: nextOpacity,
        },
      }));
      return;
    }

    if (isDefaultGeoportailLayerName(layerKey)) {
      setGeoportailLayerState((previous) => ({
        ...previous,
        opacity: {
          ...previous.opacity,
          [layerKey]: nextOpacity,
        },
      }));
      setLayers((previous) =>
        previous.map((layer) =>
          getGeoportailLayerName(layer) === layerKey
            ? { ...layer, opacity: nextOpacity }
            : layer
        )
      );
      return;
    }

    setLayers((previous) =>
      previous.map((layer) =>
        getCommunityLayerKey(layer) === layerKey
          ? { ...layer, opacity: nextOpacity }
          : layer
      )
    );
    updateUserWmsLayerState(layerKey, (layer) => ({ ...layer, opacity: nextOpacity }));
  }, [updateUserWmsLayerState]);

  const setLayerStyle = useCallback((layerKey: string, styleId: string) => {
    setLayers((previous) =>
      previous.map((layer) =>
        getCommunityLayerKey(layer) === layerKey
          ? applyLayerStyleSelection(layer, styleId)
          : layer
      )
    );
  }, []);

  const setGroupLayerOrder = useCallback((
    groupId: LayerGroupId,
    orderedLayerKeys: string[]
  ) => {
    if (groupId === 'signalements') {
      setSignalementLayerState((previous) => ({
        ...previous,
        order: normalizeSignalementLayerOrder(orderedLayerKeys),
      }));
      return;
    }

    setLayers((previousLayers) =>
      reorderLayersWithinSubset(previousLayers, orderedLayerKeys)
    );
  }, []);

  const setLayerGroupVisibility = useCallback((
    groupId: LayerGroupId,
    visible: boolean
  ) => {
    setGroupVisibility((previous) => ({
      ...previous,
      [groupId]: visible,
    }));
  }, []);

  /**
   * Applies the saved layer-panel preferences to the current layer source.
   * 'baseLayers' can come either from the live API or from the persisted offline cache snapshot.
   */
  const hydrateLayers = useCallback(async (
    communityId: number,
    baseLayers: CommunityLayer[],
    hydratedFromMode: OfflineMode
  ) => {
    const savedConfiguration = await loadLayersConfiguration(communityId, userId);
    const {
      layers: nextLayers,
      lockedByLayerKey: nextLockedByLayerKey,
    } = applySavedLayerConfiguration(
      [
        ...baseLayers,
        ...(savedConfiguration?.userWmsLayers ?? []).map(userWmsLayerToCommunityLayer),
      ],
      savedConfiguration
    );
    const nextGeoportailLayerState =
      savedConfiguration?.geoportailLayerState ?? getDefaultGeoportailLayerState();

    const nextSignalementLayerState =
      savedConfiguration?.signalementLayerState ?? getDefaultSignalementLayerState();
    const nextGroupVisibility =
      savedConfiguration?.groupVisibility ?? getDefaultLayerGroupVisibility();

    setLayers(applyDefaultGeoportailLayerState(
      nextLayers,
      nextGeoportailLayerState
    ));
    setUserWmsLayers(savedConfiguration?.userWmsLayers ?? []);
    setLockedByLayerKey(nextLockedByLayerKey);
    setGeoportailLayerState(nextGeoportailLayerState);
    setSignalementLayerState(nextSignalementLayerState);
    setGroupVisibility(nextGroupVisibility);
    setHydratedCommunityId(communityId);
    setHydratedUserId(userId);
    setHydratedMode(hydratedFromMode);
  }, [userId]);

  const loadOfflineLayers = useCallback(async () => {
    setHydratedCommunityId(null);
    setHydratedUserId(null);
    setHydratedMode(null);
    setError(null);

    if (!activeCommunityId) {
      setIsLoading(false);
      setLayers([]);
      setUserWmsLayers([]);
      resetLayerPreferences();
      return;
    }

    setIsLoading(true);

    try {
      const offlineLayers =
        activeCommunityCache?.layers.map((cacheLayer) => cacheLayer.layer) ?? [];

      console.log('[OFFLINE_MODE][useLayers] loading community layers from offline cache', {
        communityId: activeCommunityId,
        layerKeys: offlineLayers.map((layer) => getCommunityLayerKey(layer)),
        layerTitles: offlineLayers.map((layer) => getCommunityLayerTitle(layer)),
      });

      await hydrateLayers(activeCommunityId, offlineLayers, 'offline');
    } catch (err) {
      console.error('Failed to fetch layers:', err);
      setError('Failed to fetch layers');
      setLayers([]);
      setUserWmsLayers([]);
      resetLayerPreferences();
    } finally {
      setIsLoading(false);
    }
  }, [
    activeCommunityCache,
    activeCommunityId,
    hydrateLayers,
    resetLayerPreferences,
  ]);

  const fetchOnlineLayers = useCallback(async (forceRefresh = false) => {
    setHydratedCommunityId(null);
    setHydratedUserId(null);
    setHydratedMode(null);
    setError(null);

    if (!activeCommunityId) {
      setIsLoading(false);
      setLayers([]);
      setUserWmsLayers([]);
      resetLayerPreferences();
      return;
    }

    setIsLoading(true);

    try {
      console.log('[OFFLINE_MODE][useLayers] loading community layers from API', {
        communityId: activeCommunityId,
        forceRefresh,
      });

      const enrichedLayers = await fetchCommunityLayers(activeCommunityId, {
        forceRefresh,
      });

      console.log('[OFFLINE_MODE][useLayers] loaded community layers from API', {
        communityId: activeCommunityId,
        layerKeys: enrichedLayers.map((layer) => getCommunityLayerKey(layer)),
        layerTitles: enrichedLayers.map((layer) => getCommunityLayerTitle(layer)),
      });

      await hydrateLayers(activeCommunityId, enrichedLayers, 'online');
    } catch (err) {
      console.error('Failed to fetch layers:', err);
      setError('Failed to fetch layers');
      setLayers([]);
      setUserWmsLayers([]);
      resetLayerPreferences();
    } finally {
      setIsLoading(false);
    }
  }, [activeCommunityId, hydrateLayers, resetLayerPreferences]);

  useEffect(() => {
    if (mode === 'offline') {
      void loadOfflineLayers();
      return;
    }

    void fetchOnlineLayers();
  }, [fetchOnlineLayers, loadOfflineLayers, mode]);

  useEffect(() => {
    if (
      mode === 'offline' ||
      hydratedMode !== 'online' ||
      !activeCommunityId ||
      hydratedCommunityId !== activeCommunityId ||
      hydratedUserId !== userId
    ) {
      return;
    }

    void saveLayersConfiguration({
      communityId: activeCommunityId,
      userId,
      layers,
      lockedByLayerKey,
      groupVisibility,
      geoportailLayerState,
      signalementLayerState,
      userWmsLayers,
    });
  }, [
    activeCommunityId,
    hydratedCommunityId,
    hydratedMode,
    hydratedUserId,
    layers,
    lockedByLayerKey,
    mode,
    groupVisibility,
    geoportailLayerState,
    signalementLayerState,
    userWmsLayers,
    userId,
  ]);

  const refetchLayers = useCallback(() => {
    if (mode === 'offline') {
      return loadOfflineLayers();
    }

    return fetchOnlineLayers(true);
  }, [fetchOnlineLayers, loadOfflineLayers, mode]);

  const setLayerDirectContributionLock = useCallback((layerKey: string, locked: boolean) => {
    setLockedByLayerKey((previous) => {
      if (locked) {
        return {
          ...previous,
          [layerKey]: true,
        };
      }

      if (!(layerKey in previous)) {
        return previous;
      }

      const next = { ...previous };
      // remove the layer key from the lockedByLayerKey object - we don't store in it layers that are not locked
      delete next[layerKey];
      return next;
    });
  }, []);

  const loadRemoteWmsLayers = useCallback((url: string): Promise<RemoteWmsLayer[]> => {
    return fetchRemoteWmsLayers(url);
  }, []);

  const addUserWmsLayer = useCallback((remoteLayer: RemoteWmsLayer) => {
    const nextUserLayer = createUserWmsLayer(remoteLayer, userWmsLayers);
    const nextCommunityLayer = userWmsLayerToCommunityLayer(nextUserLayer);

    setUserWmsLayers((previousUserLayers) => [
      ...previousUserLayers,
      nextUserLayer,
    ]);
    setLayers((previousLayers) => [...previousLayers, nextCommunityLayer]);
    setGroupVisibility((previous) => ({
      ...previous,
      mesCartes: true,
    }));
  }, [userWmsLayers]);

  const removeUserWmsLayer = useCallback((layerKey: string) => {
    setLayers((previousLayers) => {
      const layerToRemove = previousLayers.find(
        (layer) => getCommunityLayerKey(layer) === layerKey
      )!;
      const userLayerId = getUserWmsLayerIdFromCommunityLayer(layerToRemove);

      setUserWmsLayers((previousUserLayers) =>
        previousUserLayers.filter((layer) => layer.id !== userLayerId)
      );
      return previousLayers.filter((layer) => layer !== layerToRemove);
    });
  }, []);

  return {
    layers,
    geoportailLayers,
    vectorLayers,
    mesCartesLayers,
    lockedByLayerKey,
    groupVisibility,
    geoportailLayerState,
    signalementLayerState,
    isLoading,
    error,
    refetch: refetchLayers,
    setLayerVisibility,
    setLayerOpacity,
    setLayerStyle,
    setGroupLayerOrder,
    setLayerGroupVisibility,
    setLayerDirectContributionLock,
    loadRemoteWmsLayers,
    addUserWmsLayer,
    removeUserWmsLayer,
  };
}
