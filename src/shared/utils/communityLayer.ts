import type { CommunityLayer } from '@ign/mobile-core';

export function getCommunityLayerTitle(layer: CommunityLayer): string {
  if (layer.title) {
    return layer.title;
  }

  if (layer.table?.title) {
    return layer.table.title;
  }

  return layer.table?.name ?? '';
}
