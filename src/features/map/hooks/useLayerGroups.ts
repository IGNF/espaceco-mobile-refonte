import { useMemo } from 'react';
import type { CommunityLayer } from '@ign/mobile-core';
import { useTranslation } from 'react-i18next';
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
} from '@/features/map/types/signalementLayers';

interface UseLayerGroupsParams {
  layers: CommunityLayer[];
  geoportailLayers: CommunityLayer[];
  vectorLayers: CommunityLayer[];
  signalementLayerVisibility: SignalementLayerVisibility;
  signalementLayerOpacity: SignalementLayerOpacity;
  signalementLayerOrder: SignalementLayerKey[];
  pendingChangesCountByLayerKey?: Record<string, number>;
}

function getPendingChangesCountForLayer(
  layerKey: string | undefined,
  pendingChangesCountByLayerKey: Record<string, number>
): number {
  if (!layerKey) {
    return 0;
  }

  const pendingChangesCount = pendingChangesCountByLayerKey[layerKey];
  return Number.isFinite(pendingChangesCount) && pendingChangesCount > 0
    ? Math.floor(pendingChangesCount)
    : 0;
}

function mapLayersToGroupItemsWithDirectContribution(
  layers: CommunityLayer[],
  pendingChangesCountByLayerKey: Record<string, number>
): LayerGroupItem[] {
  return layers.map((layer) => {
    const item = mapLayerToGroupItem(layer)

    return {
      ...item,
      directContribution: getCommunityLayerDirectContributionState(layer, {
        pendingChangesCount: getPendingChangesCountForLayer(
          item.layerKey,
          pendingChangesCountByLayerKey
        ),
      }),
    }
  })
}

export function useLayerGroups({
  layers,
  geoportailLayers,
  vectorLayers,
  signalementLayerVisibility,
  signalementLayerOpacity,
  signalementLayerOrder,
  pendingChangesCountByLayerKey = {},
}: UseLayerGroupsParams) {
  const { t } = useTranslation();
  const { activeCommunity } = useCommunity();

  const layerGroups = useMemo<LayerGroupDetails[]>(() => {
    const vectorLayerSet = new Set(vectorLayers);
    const geoportailLayerSet = new Set(geoportailLayers);
    const signalementDefinitionsByKey = new Map(
      SIGNALEMENT_LAYER_DEFINITIONS.map((layerDefinition) => [
        layerDefinition.key,
        layerDefinition,
      ])
    );
    const normalizedSignalementLayerOrder = normalizeSignalementLayerOrder(
      signalementLayerOrder
    );

    const signalementItems: LayerGroupItem[] = normalizedSignalementLayerOrder.map(
      (layerKey) => {
        const layerDefinition = signalementDefinitionsByKey.get(layerKey);

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
          pendingChangesCountByLayerKey
        ),
      },
      {
        id: 'mesCartes',
        title: t('layers.groups.mesCartes'),
        items: mapLayersToGroupItemsWithDirectContribution(
          mesCartesLayers,
          pendingChangesCountByLayerKey
        ),
      },
      {
        id: 'geoservices',
        title: t('layers.groups.geoservices'),
        items: mapLayersToGroupItemsWithDirectContribution(
          geoportailLayers,
          pendingChangesCountByLayerKey
        ),
      },
    ];
  }, [
    activeCommunity,
    geoportailLayers,
    layers,
    pendingChangesCountByLayerKey,
    signalementLayerVisibility,
    signalementLayerOrder,
    signalementLayerOpacity,
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
