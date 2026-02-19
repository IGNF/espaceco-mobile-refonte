import { useMemo } from 'react';
import type { CommunityLayer } from '@ign/mobile-core';
import { useTranslation } from 'react-i18next';
import { useCommunity } from '@/features/community/hooks/useCommunity';
import type {
  LayerGroupDetails,
  LayerGroupItem,
  LayerGroupSummary,
} from '@/features/map/types/layerGroups';
import {
  mapLayerGroupsToSummaries,
  mapLayersToGroupItems,
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
}

export function useLayerGroups({
  layers,
  geoportailLayers,
  vectorLayers,
  signalementLayerVisibility,
  signalementLayerOpacity,
  signalementLayerOrder,
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
        items: mapLayersToGroupItems(guichetLayers),
      },
      {
        id: 'mesCartes',
        title: t('layers.groups.mesCartes'),
        items: mapLayersToGroupItems(mesCartesLayers),
      },
      {
        id: 'geoservices',
        title: t('layers.groups.geoservices'),
        items: mapLayersToGroupItems(geoportailLayers),
      },
    ];
  }, [
    activeCommunity,
    geoportailLayers,
    layers,
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
