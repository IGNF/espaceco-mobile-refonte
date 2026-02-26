import type Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import {
  REPORT_FEATURE_KIND_PROP,
  REPORT_OBJECT_KEY_PROP,
  REPORT_OBJECT_LABEL_PROP,
  REPORT_OBJECT_LAYER_NAME_PROP,
  REPORT_OBJECT_LAYER_TITLE_PROP,
} from '@/features/report/utils/reportObjects';

const INTERNAL_REPORT_FEATURE_METADATA_KEY_SET = new Set([
  REPORT_FEATURE_KIND_PROP,
  REPORT_OBJECT_KEY_PROP,
  REPORT_OBJECT_LABEL_PROP,
  REPORT_OBJECT_LAYER_NAME_PROP,
  REPORT_OBJECT_LAYER_TITLE_PROP,
]);

type JsonRecord = Record<string, unknown>;

function isFeatureLike(value: unknown): value is Feature<Geometry> {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as {
    clone?: unknown;
    getId?: unknown;
    getProperties?: unknown;
  };

  return typeof candidate.clone === 'function' &&
    typeof candidate.getId === 'function' &&
    typeof candidate.getProperties === 'function';
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isInternalAppSketchKey(key: string): boolean {
  return INTERNAL_REPORT_FEATURE_METADATA_KEY_SET.has(key) || key.startsWith('__espaceco_');
}

function sanitizeFeatureForSketchPayload(feature: Feature<Geometry>): Feature<Geometry> {
  const clone = feature.clone();
  const featureId = feature.getId();
  if (featureId !== undefined && featureId !== null) {
    clone.setId(featureId);
  }

  for (const key of Object.keys(clone.getProperties())) {
    if (!isInternalAppSketchKey(key)) continue;
    clone.unset(key, true);
  }

  return clone;
}

function normalizeSketchObjectForApi(rawObject: unknown): unknown {
  if (!isJsonRecord(rawObject)) {
    return rawObject;
  }

  const normalizedObject: JsonRecord = { ...rawObject };

  if (normalizedObject.type === 'LineString') {
    normalizedObject.type = 'Ligne';
  }

  const rawAttributes = normalizedObject.attributes;
  if (isJsonRecord(rawAttributes)) {
    const sanitizedAttributes: JsonRecord = {};
    for (const [key, value] of Object.entries(rawAttributes)) {
      if (isInternalAppSketchKey(key)) continue;
      sanitizedAttributes[key] = value;
    }
    normalizedObject.attributes = sanitizedAttributes;
  }

  return normalizedObject;
}

/**
 * Keep only OL feature-like entries and strip internal app metadata.
 */
export function sanitizeFeaturesForSketchPayload(features: unknown[]): Feature<Geometry>[] {
  return features
    .filter(isFeatureLike)
    .map(sanitizeFeatureForSketchPayload);
}

/**
 * Normalize full sketch JSON:
 * - "context" -> "contexte" (legacy API format)
 * - strip app-only attributes from objects
 * - normalize object type labels
 */
export function normalizeSketchForApi(sketchJson: string): string {
  try {
    const parsedSketch = JSON.parse(sketchJson);
    if (!isJsonRecord(parsedSketch)) {
      return sketchJson;
    }

    if (!('contexte' in parsedSketch) && 'context' in parsedSketch) {
      parsedSketch.contexte = parsedSketch.context;
      delete parsedSketch.context;
    }

    const rawObjects = parsedSketch.objects;
    if (!Array.isArray(rawObjects)) {
      return JSON.stringify(parsedSketch);
    }

    parsedSketch.objects = rawObjects.map(normalizeSketchObjectForApi);

    return JSON.stringify(parsedSketch);
  } catch {
    return sketchJson;
  }
}
