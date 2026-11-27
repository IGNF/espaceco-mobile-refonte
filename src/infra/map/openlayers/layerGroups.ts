import type Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import type Map from 'ol/Map';
import type LayerGroup from 'ol/layer/Group';
import VectorLayer from 'ol/layer/Vector';
import type VectorSource from 'ol/source/Vector';

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

/**
 * Returns the sources of the visible vector layers of the "Mon guichet" group (WFS and collaborative tables).
 */
export function getVisibleGuichetVectorSources(map: Map): VectorSource<Feature<Geometry>>[] {
  return findLayerGroupByName(map, 'guichet')!
    .getLayers()
    .getArray()
    .filter((layer): layer is VectorLayer<VectorSource<Feature<Geometry>>> =>
      layer instanceof VectorLayer && layer.getVisible()
    )
    .map((layer) => layer.getSource()!);
}
