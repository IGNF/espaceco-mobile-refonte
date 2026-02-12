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
  type SignalementLayerVisibility,
} from '@/features/map/types/signalementLayers';

interface UseLayerGroupsParams {
  layers: CommunityLayer[];
  geoportailLayers: CommunityLayer[];
  vectorLayers: CommunityLayer[];
  signalementLayerVisibility: SignalementLayerVisibility;
}

export function useLayerGroups({
  layers,
  geoportailLayers,
  vectorLayers,
  signalementLayerVisibility,
}: UseLayerGroupsParams) {
  const { t } = useTranslation();
  const { activeCommunity } = useCommunity();

  const layerGroups = useMemo<LayerGroupDetails[]>(() => {
    const vectorLayerSet = new Set(vectorLayers);
    const geoportailLayerSet = new Set(geoportailLayers);

    const signalementItems: LayerGroupItem[] = SIGNALEMENT_LAYER_DEFINITIONS.map(
      (layerDefinition) => ({
        id: layerDefinition.key,
        layerKey: layerDefinition.key,
        title: t(layerDefinition.titleKey),
        visible: signalementLayerVisibility[layerDefinition.key],
      })
    );

    const guichetLayers = vectorLayers;
    const mesCartesLayers = layers.filter((layer) => {
      if (vectorLayerSet.has(layer)) return false;
      if (geoportailLayerSet.has(layer)) return false;
      return true;
    });

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
