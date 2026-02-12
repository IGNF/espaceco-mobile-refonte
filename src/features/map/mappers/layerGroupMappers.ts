import type { CommunityLayer } from '@ign/mobile-core';
import type {
  LayerGroupDetails,
  LayerGroupItem,
  LayerGroupSummary,
} from '@/features/map/types/layerGroups';
import { getCommunityLayerKey } from '@/shared/utils/layerKey';

function getLayerTextParts(layer: CommunityLayer): string[] {
  const tableAny = layer.table as { title?: unknown; name?: unknown } | undefined;
  const geoserviceAny = layer.geoservice as {
    title?: unknown;
    layers?: unknown;
  } | undefined;

  const values = [
    layer.title,
    tableAny?.title,
    tableAny?.name,
    geoserviceAny?.title,
    geoserviceAny?.layers,
  ];

  return values.filter(
    (value): value is string => typeof value === 'string' && value.trim().length > 0
  );
}

function getLayerDisplayName(layer: CommunityLayer): string {
  const [primaryName] = getLayerTextParts(layer);
  return primaryName ?? `Couche ${layer.id}`;
}

function getLayerDescription(layer: CommunityLayer): string | undefined {
  const layerAny = layer as CommunityLayer & { description?: unknown };
  const geoserviceAny = layer.geoservice as { description?: unknown } | undefined;
  const tableAny = layer.table as { description?: unknown } | undefined;
  const candidates = [layerAny.description, geoserviceAny?.description, tableAny?.description];

  for (const value of candidates) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return undefined;
}

function getLayerVisibility(layer: CommunityLayer): boolean {
  return layer.visible ?? true;
}

function mapLayerToGroupItem(layer: CommunityLayer): LayerGroupItem {
  const layerKey = getCommunityLayerKey(layer);

  return {
    id: layerKey,
    title: getLayerDisplayName(layer),
    layerKey,
    visible: getLayerVisibility(layer),
    description: getLayerDescription(layer),
  };
}

export function mapLayersToGroupItems(layers: CommunityLayer[]): LayerGroupItem[] {
  return layers.map((layer) => mapLayerToGroupItem(layer));
}

export function mapLayerGroupsToSummaries(
  layerGroups: LayerGroupDetails[]
): LayerGroupSummary[] {
  return layerGroups.map((group) => {
    const toggleableItems = group.items.filter(
      (item): item is LayerGroupItem & { layerKey: string } =>
        typeof item.layerKey === 'string' && item.layerKey.length > 0
    );
    const visibleItems = toggleableItems.length > 0 ? toggleableItems : group.items;
    const visible = visibleItems.some((item) => item.visible ?? true);

    return {
      id: group.id,
      title: group.title,
      count: group.items.length,
      visible,
      canToggle: toggleableItems.length > 0,
    };
  });
}
