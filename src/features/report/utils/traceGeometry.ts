import type Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import type LineString from 'ol/geom/LineString';

export interface TraceStats {
  pointCount: number;
  distanceMeters: number;
}

export function getLineStringGeometry(
  feature: Feature<Geometry> | null | undefined
): LineString | null {
  const geometry = feature?.getGeometry();
  if (!geometry || geometry.getType() !== 'LineString') {
    return null;
  }
  return geometry as LineString;
}

export function calculateTraceStats(line: LineString): TraceStats {
  return {
    pointCount: line.getCoordinates().length,
    distanceMeters: Math.round(line.getLength()),
  };
}

export function findLineStringFeature(
  features: Feature<Geometry>[]
): Feature<Geometry> | null {
  return features.find((feature) => getLineStringGeometry(feature) !== null) ?? null;
}

export function cleanLineStringCoordinates(line: LineString): void {
  line.setCoordinates(
    line.getCoordinates().filter((coordinate) => {
      return Number.isFinite(coordinate[0]) &&
        Number.isFinite(coordinate[1]) &&
        coordinate[0] !== 0 &&
        coordinate[1] !== 0;
    })
  );
}
