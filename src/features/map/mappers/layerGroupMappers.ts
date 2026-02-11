import type { CommunityLayer } from '@ign/mobile-core';
import type {
  LayerGroupDetails,
  LayerGroupItem,
  LayerGroupSummary,
} from '@/features/map/types/layerGroups';
import { getCommunityLayerKey } from '@/shared/utils/layerKey';

const SIGNAL_LAYER_KEYWORDS = ['signalement', 'croquis'];

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

export function isSignalementLayer(layer: CommunityLayer): boolean {
  const layerText = getLayerTextParts(layer).join(' ').toLowerCase();
  return SIGNAL_LAYER_KEYWORDS.some((keyword) => layerText.includes(keyword));
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
  return layerGroups.map((group) => ({
    id: group.id,
    title: group.title,
    count: group.items.length,
  }));
}
