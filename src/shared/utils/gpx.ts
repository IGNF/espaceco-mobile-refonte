import type Feature from 'ol/Feature';
import GPX from 'ol/format/GPX';
import type Geometry from 'ol/geom/Geometry';
import type OlMap from 'ol/Map';

/**
 * Serializes a map feature to GPX using the map projection as the source
 * projection. OpenLayers writes GPX coordinates in WGS84.
 */
export function createGpxFromFeature(feature: Feature<Geometry>, map: OlMap): string {
  const format = new GPX();
  const gpx = format.writeFeatures([feature], {
    featureProjection: map.getView().getProjection(),
  });

  return gpx.startsWith('<?xml')
    ? gpx
    : `<?xml version="1.0"?>${gpx}`;
}

/**
 * Keeps the legacy export filename format: one GPX file named from today's date.
 */
export function createGpxFilename(date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}.gpx`;
}
