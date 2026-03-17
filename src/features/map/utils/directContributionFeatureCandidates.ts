import type { Table } from '@ign/mobile-core';
import Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import type BaseLayer from 'ol/layer/Base';
import type OlMap from 'ol/Map';
import type VectorSource from 'ol/source/Vector';
import { getUid } from 'ol/util';
import type { DirectContributionFeatureCandidate } from '@/features/map/types/directContribution';

const PRIMARY_LABEL_PROPERTY_NAME_REGEX = /(nom|name|label|titre|title)/i;
const SECONDARY_LABEL_PROPERTY_NAME_REGEX = /nature/i;

function toCandidateText(candidate: unknown): string | null {
  if (typeof candidate === 'string') {
    const normalizedValue = candidate.trim();
    return normalizedValue.length > 0 ? normalizedValue : null;
  }

  if (typeof candidate === 'number' || typeof candidate === 'boolean') {
    return String(candidate);
  }

  return null;
}

function getFeatureIdentifier(
  feature: Feature<Geometry>,
  table: Table
): string | null {
  const idPropertyName = table.idName ?? 'id';
  const rawIdentifier = feature.get(idPropertyName) ?? feature.getId();

  return toCandidateText(rawIdentifier);
}

function getFeatureCandidateLabel(
  feature: Feature<Geometry>,
  table: Table,
  featureIdentifier: string | null,
  fallbackLabel: string
): string {
  const properties = { ...feature.getProperties() };
  delete properties.geometry;
  delete properties[table.geometryName];

  let primaryLabel: string | null = null;
  let secondaryLabel: string | null = null;
  let firstUsableValue: string | null = null;

  for (const [propertyName, propertyValue] of Object.entries(properties)) {
    const normalizedValue = toCandidateText(propertyValue);
    if (!normalizedValue) {
      continue;
    }

    if (!primaryLabel && PRIMARY_LABEL_PROPERTY_NAME_REGEX.test(propertyName)) {
      primaryLabel = normalizedValue;
    }

    if (!secondaryLabel && SECONDARY_LABEL_PROPERTY_NAME_REGEX.test(propertyName)) {
      secondaryLabel = normalizedValue;
    }

    const normalizedPropertyName = propertyName.toLowerCase();
    const isTechnicalProperty =
      normalizedPropertyName.startsWith('_') ||
      normalizedPropertyName.includes('geom') ||
      normalizedPropertyName.includes('shape');

    if (!firstUsableValue && !isTechnicalProperty && normalizedValue.length >= 2) {
      firstUsableValue = normalizedValue;
    }
  }

  return primaryLabel ?? secondaryLabel ?? featureIdentifier ?? firstUsableValue ?? fallbackLabel;
}

function buildFeatureCandidate(
  feature: Feature<Geometry>,
  table: Table,
  fallbackLabel: string
): DirectContributionFeatureCandidate {
  const featureIdentifier = getFeatureIdentifier(feature, table);
  const label = getFeatureCandidateLabel(
    feature,
    table,
    featureIdentifier,
    fallbackLabel
  );
  const secondaryLabel =
    featureIdentifier && featureIdentifier !== label
      ? `${table.idName ?? 'id'} : ${featureIdentifier}`
      : undefined;

  return {
    key: featureIdentifier ?? String(getUid(feature)),
    label,
    secondaryLabel,
    feature,
  };
}

export interface DirectContributionFeatureCandidatesAtPixelOptions {
  map: OlMap;
  pixel: number[];
  layer: BaseLayer;
  source: VectorSource<Feature<Geometry>>;
  table: Table;
  hitTolerance: number;
  fallbackLabel: string;
}

function addFeatureCandidate(
  candidatesByKey: Map<string, DirectContributionFeatureCandidate>,
  feature: Feature<Geometry>,
  table: Table,
  fallbackLabel: string
): void {
  const candidate = buildFeatureCandidate(feature, table, fallbackLabel);
  if (candidatesByKey.has(candidate.key)) {
    return;
  }

  candidatesByKey.set(candidate.key, candidate);
}

function getPixelSearchExtent(
  map: OlMap,
  pixel: number[],
  hitTolerance: number
): [number, number, number, number] | null {
  const topLeft = map.getCoordinateFromPixel([
    pixel[0] - hitTolerance,
    pixel[1] - hitTolerance,
  ]);
  const bottomRight = map.getCoordinateFromPixel([
    pixel[0] + hitTolerance,
    pixel[1] + hitTolerance,
  ]);

  if (!topLeft || !bottomRight) {
    return null;
  }

  return [
    Math.min(topLeft[0], bottomRight[0]),
    Math.min(topLeft[1], bottomRight[1]),
    Math.max(topLeft[0], bottomRight[0]),
    Math.max(topLeft[1], bottomRight[1]),
  ];
}

function isFeatureNearPixel(
  map: OlMap,
  feature: Feature<Geometry>,
  pixel: number[],
  hitTolerance: number
): boolean {
  const coordinate = map.getCoordinateFromPixel(pixel);
  const geometry = feature.getGeometry();

  if (!coordinate || !geometry || typeof geometry.getClosestPoint !== 'function') {
    return false;
  }

  const closestPoint = geometry.getClosestPoint(coordinate);
  const closestPixel = map.getPixelFromCoordinate(closestPoint);
  const deltaX = closestPixel[0] - pixel[0];
  const deltaY = closestPixel[1] - pixel[1];

  return Math.hypot(deltaX, deltaY) <= hitTolerance;
}

// Collect every candidate feature around the tapped pixel for the edited layer.
// When several features are found, the session can open a chooser instead of
// editing the first one directly.
export function getDirectContributionFeatureCandidatesAtPixel({
  map,
  pixel,
  layer,
  source,
  table,
  hitTolerance,
  fallbackLabel,
}: DirectContributionFeatureCandidatesAtPixelOptions): DirectContributionFeatureCandidate[] {
  const candidatesByKey = new Map<string, DirectContributionFeatureCandidate>();

  map.forEachFeatureAtPixel(
    pixel,
    (featureLike, layerLike) => {
      if (!(featureLike instanceof Feature)) {
        return undefined;
      }

      // Skip cluster wrappers and keep only the real collaborative features.
      if (Array.isArray(featureLike.get('features'))) {
        return undefined;
      }

      if (layerLike !== layer) {
        return undefined;
      }

      addFeatureCandidate(
        candidatesByKey,
        featureLike as Feature<Geometry>,
        table,
        fallbackLabel
      );

      return undefined;
    },
    { hitTolerance }
  );

  // Some render paths only report the top visible feature at a pixel.
  // Query the source around the tap as well so overlapping nearby objects
  // can still appear in the chooser.
  const pixelSearchExtent = getPixelSearchExtent(map, pixel, hitTolerance);
  if (!pixelSearchExtent) {
    return Array.from(candidatesByKey.values());
  }

  const nearbyFeatures = source.getFeaturesInExtent(pixelSearchExtent) as Feature<Geometry>[];
  for (const feature of nearbyFeatures) {
    if (!isFeatureNearPixel(map, feature, pixel, hitTolerance)) {
      continue;
    }

    addFeatureCandidate(candidatesByKey, feature, table, fallbackLabel);
  }

  return Array.from(candidatesByKey.values());
}
