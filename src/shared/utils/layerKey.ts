import type { CommunityLayer } from '@ign/mobile-core';

export function getCommunityLayerKey(layer: CommunityLayer): string {
  const geoserviceAny = layer.geoservice as { layers?: unknown } | undefined;
  const tableAny = layer.table as { name?: unknown } | undefined;

  const geoserviceLayer =
    typeof geoserviceAny?.layers === 'string' ? geoserviceAny.layers : '';
  const tableName = typeof tableAny?.name === 'string' ? tableAny.name : '';
  const title = typeof layer.title === 'string' ? layer.title : '';

  return [String(layer.id ?? ''), title, geoserviceLayer, tableName].join('::');
}
