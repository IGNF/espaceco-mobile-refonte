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

export function getCommunityLayerGeometryType(
  layer: CommunityLayer | null
): 'Point' | 'LineString' | 'Polygon' | null {
  const table = layer?.table;

  if (!table) {
    return null;
  }

  const geometryColumn = table.columns[table.geometryName] as
    | { type?: unknown }
    | undefined;
  const rawType =
    typeof geometryColumn?.type === 'string' ? geometryColumn.type : '';

  if (/point/i.test(rawType)) {
    return 'Point';
  }

  if (/line/i.test(rawType)) {
    return 'LineString';
  }

  if (/polygon/i.test(rawType)) {
    return 'Polygon';
  }

  return null;
}
