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
  isSignalementLayer,
  mapLayerGroupsToSummaries,
  mapLayersToGroupItems,
} from '@/features/map/mappers/layerGroupMappers';

interface UseLayerGroupsParams {
  layers: CommunityLayer[];
  geoportailLayers: CommunityLayer[];
  vectorLayers: CommunityLayer[];
}

export function useLayerGroups({
  layers,
  geoportailLayers,
  vectorLayers,
}: UseLayerGroupsParams) {
  const { t } = useTranslation();
  const { activeCommunity } = useCommunity();

  const layerGroups = useMemo<LayerGroupDetails[]>(() => {
    const vectorLayerSet = new Set(vectorLayers);
    const geoportailLayerSet = new Set(geoportailLayers);

    const signalementLayers = layers.filter(isSignalementLayer);
    const signalementItems: LayerGroupItem[] =
      signalementLayers.length > 0
        ? mapLayersToGroupItems(signalementLayers)
        : [
            {
              id: 'default-mes-signalements',
              title: t('layers.defaults.mesSignalements'),
              visible: true,
            },
            {
              id: 'default-croquis',
              title: t('layers.defaults.croquis'),
              visible: true,
            },
            {
              id: 'default-signalements',
              title: t('layers.defaults.signalements'),
              visible: true,
            },
          ];

    const guichetLayers = vectorLayers.filter((layer) => !isSignalementLayer(layer));
    const mesCartesLayers = layers.filter((layer) => {
      if (isSignalementLayer(layer)) return false;
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
  }, [activeCommunity, geoportailLayers, layers, t, vectorLayers]);

  const layerGroupSummaries = useMemo<LayerGroupSummary[]>(
    () => mapLayerGroupsToSummaries(layerGroups),
    [layerGroups]
  );

  return {
    layerGroups,
    layerGroupSummaries,
  };
}
