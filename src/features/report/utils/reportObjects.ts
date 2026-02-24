import type Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import type BaseLayer from 'ol/layer/Base';

export const REPORT_OBJECT_KEY_PROP = '__espaceco_report_object_key';
export const REPORT_OBJECT_LABEL_PROP = '__espaceco_report_object_label';
export const REPORT_OBJECT_LAYER_TITLE_PROP = '__espaceco_report_object_layer_title';
export const REPORT_OBJECT_LAYER_NAME_PROP = '__espaceco_report_object_layer_name';
export const REPORT_FEATURE_KIND_PROP = '__espaceco_report_feature_kind';

export type ReportFeatureKind = 'object' | 'sketch';

const LABEL_PROPERTY_NAME_REGEX = /name|nom|label/i;
const KEY_PROPERTY_NAME_REGEX = /(^|_)(id|gid|fid|objectid|numero|num|code|reference|ref)($|_)/i;
const NATURE_PROPERTY_NAME_REGEX = /^nature$/i;

const INTERNAL_FEATURE_PROPERTY_NAMES = new Set([
  'geometry',
  'features',
  REPORT_OBJECT_KEY_PROP,
  REPORT_OBJECT_LABEL_PROP,
  REPORT_OBJECT_LAYER_TITLE_PROP,
  REPORT_OBJECT_LAYER_NAME_PROP,
  REPORT_FEATURE_KIND_PROP,
]);

function normalizeLabelValue(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function getMetadataString(feature: Feature<Geometry>, key: string): string | null {
  const value = feature.get(key);
  return normalizeLabelValue(value);
}

/**
 * Returns feature properties excluding geometry and internal report-metadata fields.
 */
function getFeatureProperties(feature: Feature<Geometry>): Record<string, unknown> {
  const properties = feature.getProperties();
  const filteredProperties: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(properties)) {
    if (INTERNAL_FEATURE_PROPERTY_NAMES.has(key)) continue;
    filteredProperties[key] = value;
  }

  return filteredProperties;
}

function findFirstPropertyValueByNamePattern(
  properties: Record<string, unknown>,
  pattern: RegExp
): { propertyName: string; value: string } | null {
  for (const [propertyName, rawValue] of Object.entries(properties)) {
    if (!pattern.test(propertyName)) continue;

    const value = normalizeLabelValue(rawValue);
    if (value) {
      return { propertyName, value };
    }
  }

  return null;
}

function buildPrimitivePropertiesFingerprint(properties: Record<string, unknown>): string {
  return Object.entries(properties)
    .filter(([, value]) => {
      return typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean';
    })
    .map(([key, value]) => `${key}=${String(value).trim()}`)
    .sort()
    .slice(0, 10)
    .join('|');
}

/**
 * Returns the best display title for a map layer (title first, then name).
 */
export function getLayerDisplayTitle(layer: BaseLayer | null | undefined): string | null {
  if (!layer) return null;

  const title = normalizeLabelValue(layer.get('title'));
  if (title) return title;

  return normalizeLabelValue(layer.get('name'));
}

export function getReportObjectKey(feature: Feature<Geometry>): string | null {
  return getMetadataString(feature, REPORT_OBJECT_KEY_PROP);
}

export function getReportObjectLayerTitle(feature: Feature<Geometry>): string | null {
  return getMetadataString(feature, REPORT_OBJECT_LAYER_TITLE_PROP);
}

/**
 * Returns the stored source layer name for a selected report object.
 */
export function getReportObjectLayerName(feature: Feature<Geometry>): string | null {
  return getMetadataString(feature, REPORT_OBJECT_LAYER_NAME_PROP);
}

export function getReportFeatureKind(feature: Feature<Geometry>): ReportFeatureKind | null {
  const kind = feature.get(REPORT_FEATURE_KIND_PROP);
  return kind === 'object' || kind === 'sketch' ? kind : null;
}

export function setReportFeatureKind(feature: Feature<Geometry>, kind: ReportFeatureKind): void {
  feature.set(REPORT_FEATURE_KIND_PROP, kind, true);
}

/**
 * Tries to resolve a human-readable label for a picked map feature.
 * Lookup order: explicit metadata label, property name matching /name|nom|label/,
 * then "nature", then first usable primitive field.
 */
export function getReportObjectLabel(feature: Feature<Geometry>): string | null {
  const metadataLabel = getMetadataString(feature, REPORT_OBJECT_LABEL_PROP);
  if (metadataLabel) return metadataLabel;

  const properties = getFeatureProperties(feature);
  const candidateLabel = findFirstPropertyValueByNamePattern(
    properties,
    LABEL_PROPERTY_NAME_REGEX
  )?.value;
  if (candidateLabel) return candidateLabel;

  const natureLabel = findFirstPropertyValueByNamePattern(
    properties,
    NATURE_PROPERTY_NAME_REGEX
  )?.value;
  if (natureLabel) return natureLabel;

  for (const [key, rawValue] of Object.entries(properties)) {
    const lowerKey = key.toLowerCase();
    if (lowerKey.startsWith('_')) continue;
    if (lowerKey.includes('geom')) continue;
    if (lowerKey.includes('shape')) continue;

    const value = normalizeLabelValue(rawValue);
    if (!value) continue;
    if (value.length < 2) continue;
    return value;
  }

  return null;
}

/**
 * Builds a stable identifier for a selected feature to prevent duplicates in the report form.
 * Prefers explicit metadata and ids, then falls back to geometry + primitive property fingerprint.
 */
export function buildReportObjectKey(
  feature: Feature<Geometry>,
  layerName: string
): string {
  const metadataKey = getReportObjectKey(feature);
  if (metadataKey) return metadataKey;

  const featureId = feature.getId();
  if (featureId !== undefined && featureId !== null) {
    return `${layerName}::id::${String(featureId)}`;
  }

  const properties = getFeatureProperties(feature);
  const candidateMatch = findFirstPropertyValueByNamePattern(
    properties,
    KEY_PROPERTY_NAME_REGEX
  );
  if (candidateMatch) {
    return `${layerName}::property::${candidateMatch.propertyName}::${candidateMatch.value}`;
  }

  const geometry = feature.getGeometry();
  const primitivePropertiesFingerprint = buildPrimitivePropertiesFingerprint(properties);

  if (geometry) {
    const extent = geometry.getExtent();
    const extentKey = extent
      .map((coord) => (Number.isFinite(coord) ? coord.toFixed(6) : '0'))
      .join(',');
    const geometryType = geometry.getType();
    return `${layerName}::geometry::${geometryType}::${extentKey}::${primitivePropertiesFingerprint}`;
  }

  if (primitivePropertiesFingerprint.length > 0) {
    return `${layerName}::properties::${primitivePropertiesFingerprint}`;
  }

  return `${layerName}::feature`;
}

export interface ReportObjectMetadata {
  key: string;
  label: string;
  layerTitle?: string | null;
  layerName?: string | null;
}

/**
 * Persists normalized report-object metadata on a feature so it can be reused
 * later (display label, dedupe key, layer info).
 */
export function applyReportObjectMetadata(
  feature: Feature<Geometry>,
  metadata: ReportObjectMetadata
): void {
  feature.set(REPORT_OBJECT_KEY_PROP, metadata.key, true);
  feature.set(REPORT_OBJECT_LABEL_PROP, metadata.label, true);
  setReportFeatureKind(feature, 'object');

  if (metadata.layerTitle) {
    feature.set(REPORT_OBJECT_LAYER_TITLE_PROP, metadata.layerTitle, true);
  }

  if (metadata.layerName) {
    feature.set(REPORT_OBJECT_LAYER_NAME_PROP, metadata.layerName, true);
  }
}
