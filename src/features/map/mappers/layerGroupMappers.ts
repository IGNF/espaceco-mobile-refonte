import type { CommunityLayer } from '@ign/mobile-core';

import type {
  LayerGroupDetails,
  LayerGroupDirectContributionState,
  LayerGroupItem,
  LayerGroupSummary,
} from '@/features/map/types/layerGroups';

import { getCommunityLayerKey } from '@/shared/utils/layerKey';
import { clampNumber } from '@/shared/utils/number';

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

function getLayerOpacity(layer: CommunityLayer): number {
  const opacity = layer.opacity;
  if (typeof opacity !== 'number' || Number.isNaN(opacity)) {
    return 1;
  }
  return clampNumber(opacity, 0, 1);
}

export function mapLayerToGroupItem(layer: CommunityLayer): LayerGroupItem {
  const layerKey = getCommunityLayerKey(layer);

  return {
    id: layerKey,
    title: getLayerDisplayName(layer),
    layerKey,
    visible: getLayerVisibility(layer),
    opacity: getLayerOpacity(layer),
    description: getLayerDescription(layer),
  };
}

export function mapLayersToGroupItems(layers: CommunityLayer[]): LayerGroupItem[] {
  return layers.map(mapLayerToGroupItem);
}

export function mapLayerGroupsToSummaries(
  layerGroups: LayerGroupDetails[]
): LayerGroupSummary[] {
  return layerGroups.map((group) => {
    let hasToggleableItems = false;
    let hasVisibleToggleableItem = false;
    let hasVisibleItem = false;
    let hasDirectContributionItems = false;
    let pendingDirectContributionCount = 0;
    let isSubmittingDirectContribution = false;

    for (const item of group.items) {
      if (item.visible ?? true) {
        hasVisibleItem = true;
      }

      if (!item.layerKey) {
        continue;
      }

      hasToggleableItems = true;
      if (item.visible ?? true) {
        hasVisibleToggleableItem = true;
      }

      if (item.directContribution) {
        hasDirectContributionItems = true;
        pendingDirectContributionCount += item.directContribution.pendingChangesCount;
        isSubmittingDirectContribution =
          isSubmittingDirectContribution || item.directContribution.isSubmitting;
      }
    }

    const visible = hasToggleableItems ? hasVisibleToggleableItem : hasVisibleItem;
    const directContribution: LayerGroupDirectContributionState | undefined =
      hasDirectContributionItems
        ? {
            pendingChangesCount: pendingDirectContributionCount,
            isSubmitting: isSubmittingDirectContribution,
          }
        : undefined;

    return {
      id: group.id,
      title: group.title,
      count: group.items.length,
      visible,
      canToggle: hasToggleableItems,
      directContribution,
    };
  });
}
