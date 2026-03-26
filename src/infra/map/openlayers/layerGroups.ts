import type Map from 'ol/Map';
import type LayerGroup from 'ol/layer/Group';

/**
 * Returns one OpenLayers layer group by its configured name.
 */
export function findLayerGroupByName(
  map: Map,
  name: string
): LayerGroup | undefined {
  return map
    .getLayers()
    .getArray()
    .find((layer) => layer.get('name') === name) as LayerGroup | undefined;
}
