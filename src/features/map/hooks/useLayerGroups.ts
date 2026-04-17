import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { CommunityLayer } from '@ign/mobile-core';

import { getCommunityLayerDirectContributionState } from '@/domain/community/directContribution';

import { useCommunity } from '@/features/community/hooks/useCommunity';
import type {
  LayerGroupDetails,
  LayerGroupItem,
  LayerGroupSummary,
} from '@/features/map/types/layerGroups';
import {
  mapLayerGroupsToSummaries,
  mapLayerToGroupItem,
} from '@/features/map/mappers/layerGroupMappers';
import {
  SIGNALEMENT_LAYER_DEFINITIONS,
  type SignalementLayerKey,
  type SignalementLayerOpacity,
  type SignalementLayerVisibility,
  normalizeSignalementLayerOrder,
} from '@/features/map/constants/signalementLayers.constants';

interface UseLayerGroupsParams {
  layers: CommunityLayer[];
  geoportailLayers: CommunityLayer[];
  vectorLayers: CommunityLayer[];
  signalementLayerVisibility: SignalementLayerVisibility;
  signalementLayerOpacity: SignalementLayerOpacity;
  signalementLayerOrder: SignalementLayerKey[];
  pendingChangesCountByLayerKey?: Record<string, number>;
  lockedByLayerKey?: Record<string, boolean>;
  submittingByLayerKey?: Record<string, boolean>;
}

function mapLayersToGroupItemsWithDirectContribution(
  layers: CommunityLayer[],
  pendingChangesCountByLayerKey: Record<string, number>,
  lockedByLayerKey: Record<string, boolean>,
  submittingByLayerKey: Record<string, boolean>
): LayerGroupItem[] {
  return layers.map((layer) => {
    const item = mapLayerToGroupItem(layer);
    const layerKey = item.layerKey;
    const rawPendingChangesCount =
      layerKey ? pendingChangesCountByLayerKey[layerKey] : undefined;
    const pendingChangesCount =
      typeof rawPendingChangesCount === 'number' && rawPendingChangesCount > 0
        ? Math.floor(rawPendingChangesCount)
        : 0;

    return {
      ...item,
      directContribution: getCommunityLayerDirectContributionState(layer, {
        pendingChangesCount,
        locked: layerKey ? lockedByLayerKey[layerKey] === true : false,
        isSubmitting: layerKey ? submittingByLayerKey[layerKey] === true : false,
      }),
    };
  });
}

export function useLayerGroups({
  layers,
  geoportailLayers,
  vectorLayers,
  signalementLayerVisibility,
  signalementLayerOpacity,
  signalementLayerOrder,
  pendingChangesCountByLayerKey = {},
  lockedByLayerKey = {},
  submittingByLayerKey = {},
}: UseLayerGroupsParams) {
  const { t } = useTranslation();
  const { activeCommunity } = useCommunity();

  const layerGroups = useMemo<LayerGroupDetails[]>(() => {
    const vectorLayerSet = new Set(vectorLayers);
    const geoportailLayerSet = new Set(geoportailLayers);
    const normalizedSignalementLayerOrder = normalizeSignalementLayerOrder(
      signalementLayerOrder
    );

    const signalementItems: LayerGroupItem[] = normalizedSignalementLayerOrder.map(
      (layerKey) => {
        const layerDefinition = SIGNALEMENT_LAYER_DEFINITIONS.find(
          (definition) => definition.key === layerKey
        );

        return {
          id: layerKey,
          layerKey,
          title: layerDefinition ? t(layerDefinition.titleKey) : layerKey,
          visible: signalementLayerVisibility[layerKey],
          opacity: signalementLayerOpacity[layerKey],
        };
      }
    );

    const guichetLayers = vectorLayers;
    const mesCartesLayers = layers.filter(
      (layer) => !vectorLayerSet.has(layer) && !geoportailLayerSet.has(layer)
    );

    const guichetTitle = activeCommunity?.name
      ? `${t('layers.groups.guichet')} ${activeCommunity.name}`
      : t('layers.groups.guichet');

    return [
      {
        id: 'signalements',
        title: t('layers.groups.signalements'),
        items: signalementItems,
      },
      {
        id: 'guichet',
        title: guichetTitle,
        items: mapLayersToGroupItemsWithDirectContribution(
          guichetLayers,
          pendingChangesCountByLayerKey,
          lockedByLayerKey,
          submittingByLayerKey
        ),
      },
      {
        id: 'mesCartes',
        title: t('layers.groups.mesCartes'),
        items: mapLayersToGroupItemsWithDirectContribution(
          mesCartesLayers,
          pendingChangesCountByLayerKey,
          lockedByLayerKey,
          submittingByLayerKey
        ),
      },
      {
        id: 'geoservices',
        title: t('layers.groups.geoservices'),
        items: mapLayersToGroupItemsWithDirectContribution(
          geoportailLayers,
          pendingChangesCountByLayerKey,
          lockedByLayerKey,
          submittingByLayerKey
        ),
      },
    ];
  }, [
    activeCommunity,
    geoportailLayers,
    layers,
    lockedByLayerKey,
    pendingChangesCountByLayerKey,
    signalementLayerOpacity,
    signalementLayerVisibility,
    signalementLayerOrder,
    submittingByLayerKey,
    t,
    vectorLayers,
  ]);

  const layerGroupSummaries = useMemo<LayerGroupSummary[]>(
    () => mapLayerGroupsToSummaries(layerGroups),
    [layerGroups]
  );

  return {
    layerGroups,
    layerGroupSummaries,
  };
}
