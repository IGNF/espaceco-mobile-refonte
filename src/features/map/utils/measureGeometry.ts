import type { Coordinate } from 'ol/coordinate';
import type { FeatureLike } from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import type { ProjectionLike } from 'ol/proj';
import { getArea, getLength } from 'ol/sphere';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';

import { getColorCode } from '@/shared/utils/color';

export type MeasureMode = 'length' | 'area';

interface MeasureLabel {
  coordinate: Coordinate;
  text: string;
  kind: 'segment' | 'total';
}

export interface MeasureSketch {
  geometry: LineString | Polygon | Point | null;
  labels: MeasureLabel[];
  summary: string | null;
}

const roundedFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const decimalFormat = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function hasEnoughMeasureVertices(mode: MeasureMode, vertexCount: number): boolean {
  return mode === 'length' ? vertexCount >= 2 : vertexCount >= 3;
}

/**
 * Builds the drawn geometry, the on-map labels and the bar total from the same coordinates
 */
export function buildMeasureSketch(
  mode: MeasureMode,
  coordinates: Coordinate[],
  projection: ProjectionLike,
): MeasureSketch {
  if (coordinates.length === 0) {
    return { geometry: null, labels: [], summary: null };
  }

  const geometry = createMeasureGeometry(mode, coordinates);
  const labels = buildMeasureLabels(mode, coordinates, geometry, projection);
  const summary = mode === 'area' && !(geometry instanceof Polygon)
    ? null
    : labels.find((label) => label.kind === 'total')?.text ?? null;
  return { geometry, labels, summary };
}

export function measureStyle(feature: FeatureLike): Style[] {
  const geometry = feature.getGeometry();
  if (!geometry) {
    return [];
  }

  const color = getColorCode('primary-shade');
  const styles = [new Style({
    fill: new Fill({ color: `rgba(${getColorCode('primary-rgb')}, 0.2)` }),
    stroke: new Stroke({
      color,
      width: 3,
      lineCap: 'round',
      lineJoin: 'round',
    }),
    image: createVertexImage(color),
  })];
  if (geometry.getType() === 'Point') {
    return styles;
  }

  const coordinates = geometry instanceof Polygon
    ? geometry.getCoordinates()[0]?.slice(0, -1) ?? []
    : (geometry as LineString).getCoordinates();

  for (const coordinate of coordinates) {
    styles.push(new Style({
      geometry: new Point(coordinate),
      image: createVertexImage(color),
    }));
  }

  return styles;
}

/**
 * Labels each segment. A single segment is the whole measurement, so it is shown once as the total.
 * A polygon also labels the edge that closes back to the first vertex, and puts the area at the center.
 */
function buildMeasureLabels(
  mode: MeasureMode,
  coordinates: Coordinate[],
  geometry: LineString | Polygon | Point,
  projection: ProjectionLike,
): MeasureLabel[] {
  const segments: MeasureLabel[] = [];
  for (let index = 1; index < coordinates.length; index += 1) {
    pushSegmentLabel(segments, coordinates[index - 1], coordinates[index], projection);
  }

  if (mode === 'area' && geometry instanceof Polygon) {
    pushSegmentLabel(segments, coordinates[coordinates.length - 1], coordinates[0], projection);
    segments.push({
      coordinate: geometry.getInteriorPoint().getCoordinates(),
      text: formatArea(Math.abs(getArea(geometry, { projection }))),
      kind: 'total',
    });
    return segments;
  }

  if (segments.length === 1) {
    return [{ ...segments[0], kind: 'total' }];
  }

  if (!(geometry instanceof LineString)) {
    return segments;
  }

  segments.push({
    coordinate: coordinates[coordinates.length - 1],
    text: formatLength(getLength(geometry, { projection })),
    kind: 'total',
  });
  return segments;
}

function pushSegmentLabel(
  labels: MeasureLabel[],
  start: Coordinate,
  end: Coordinate,
  projection: ProjectionLike,
): void {
  const meters = getLength(new LineString([start, end]), { projection });
  if (meters <= 0) {
    return;
  }

  labels.push({
    coordinate: [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2],
    text: formatLength(meters),
    kind: 'segment',
  });
}

/**
 * Copies coordinates before handing them to OpenLayers.
 * The library can mutate a geometry's coordinate arrays, which would corrupt React state.
 * A polygon ring must repeat its first point to close the shape.
 */
function createMeasureGeometry(
  mode: MeasureMode,
  coordinates: Coordinate[],
): LineString | Polygon | Point {
  if (mode === 'area' && coordinates.length >= 3) {
    const ring = coordinates.map((coordinate) => coordinate.slice());
    ring.push(coordinates[0].slice());
    return new Polygon([ring]);
  }

  if (coordinates.length >= 2) {
    return new LineString(coordinates.map((coordinate) => coordinate.slice()));
  }

  return new Point(coordinates[0].slice());
}

function createVertexImage(color: string): CircleStyle {
  return new CircleStyle({
    radius: 5,
    fill: new Fill({ color: '#ffffff' }),
    stroke: new Stroke({ color, width: 2 }),
  });
}

function formatLength(meters: number): string {
  if (meters >= 1000) {
    const kilometers = meters / 1000;
    const formatted = kilometers >= 100
      ? roundedFormat.format(kilometers)
      : decimalFormat.format(kilometers);
    return `${formatted} km`;
  }

  return `${roundedFormat.format(meters)} m`;
}

function formatArea(squareMeters: number): string {
  if (squareMeters >= 10_000) {
    const hectares = squareMeters / 10_000;
    const formatted = hectares >= 100
      ? roundedFormat.format(hectares)
      : decimalFormat.format(hectares);
    return `${formatted} ha`;
  }

  return `${roundedFormat.format(squareMeters)} m²`;
}
