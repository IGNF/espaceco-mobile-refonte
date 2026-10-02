import WKT from 'ol/format/WKT';
import GeoJSON from 'ol/format/GeoJSON';
import { ReportStorageAdapter } from '@/infra/storage';
import { blobToBase64 } from '@/shared/utils/blob';
import { WGS84_PROJECTION } from '@/shared/constants/projections';
import { exportDateStamp, type ExportFilePart } from '@/platform/device/exportFile';

const reportStorage = new ReportStorageAdapter();
const wktFormat = new WKT();
const geoJsonFormat = new GeoJSON();
const WGS84_OPTIONS = {
  // The stored geometry is WKT in degrees. Reading and writing in the same projection keeps longitude/latitude as-is.
  dataProjection: WGS84_PROJECTION,
  featureProjection: WGS84_PROJECTION,
} as const;

type GeoJsonGeometry = ReturnType<GeoJSON['writeGeometryObject']>;

interface GeoJsonFeature {
  type: 'Feature';
  geometry: GeoJsonGeometry | null;
  properties: Record<string, unknown>;
}

/**
 * Exports local draft reports as a GeoJSON FeatureCollection, plus their photos.
 * Each photo is named photos/{reportId}_{photoNumber}.jpg so it can be matched to its report.
 */
export async function exportDraftReports(dateStamp = exportDateStamp()): Promise<ExportFilePart[]> {
  const drafts = await reportStorage.listStoredDrafts();
  const fileName = `${dateStamp}_signalements.geojson`;
  const files: ExportFilePart[] = [];
  const features: GeoJsonFeature[] = [];

  for (const draft of drafts) {
    const sourcePhotos = Array.isArray(draft.photos) ? draft.photos : [];
    const photos = [];

    for (let index = 0; index < sourcePhotos.length; index += 1) {
      const photo = sourcePhotos[index];
      if (!photo?.localPath) continue;

      const blob = await reportStorage.getBlob(photo);
      const extension = blob.type === 'image/png' ? 'png' : 'jpg';
      const path = `photos/${draft.id}_${index + 1}.${extension}`;
      files.push({
        path,
        data: await blobToBase64(blob),
        encoding: 'base64',
      });
      photos.push({ file: path });
    }

    const properties = reportProperties(draft, photos);
    const stored = storedFeatures(draft.features);
    const pointGeometry = typeof draft.geometry === 'string' ? wktToGeometry(draft.geometry) : null;

    if (pointGeometry) {
      features.push({
        type: 'Feature',
        geometry: pointGeometry,
        properties,
      });
    }

    // A point and a sketch or trace are separate features, sharing the same report id. The id is set last so a feature property cannot replace it.
    for (const storedFeature of stored) {
      features.push({
        type: 'Feature',
        geometry: storedFeature.geometry,
        properties: {
          ...properties,
          ...(storedFeature.properties ?? {}),
          id: draft.id,
        },
      });
    }

    // Keep a report that has attributes or photos but no geometry yet.
    if (!pointGeometry && stored.length === 0) {
      features.push({
        type: 'Feature',
        geometry: null,
        properties,
      });
    }
  }

  files.push({
    path: fileName,
    data: JSON.stringify({
      type: 'FeatureCollection',
      features,
    }, null, 2),
    encoding: 'utf8',
  });

  return files;
}

function reportProperties(
  draft: Record<string, any>,
  photos: Array<{ file: string }>
): Record<string, unknown> {
  const { geometry: _geometry, features: _features, photos: _photos, ...properties } = draft;
  return {
    ...properties,
    photos,
  };
}

function wktToGeometry(wkt: string): GeoJsonGeometry | null {
  if (wkt.trim() === '') return null;

  try {
    const geometry = wktFormat.readGeometry(wkt, WGS84_OPTIONS);
    return geoJsonFormat.writeGeometryObject(geometry, WGS84_OPTIONS);
  } catch {
    return null;
  }
}

function storedFeatures(
  value: unknown
): Array<{ geometry: GeoJsonGeometry; properties?: Record<string, unknown> }> {
  if (!value || typeof value !== 'object') return [];

  const features = (value as { features?: unknown }).features;
  if (!Array.isArray(features)) return [];

  const stored = [];
  for (const candidate of features) {
    if (!candidate || typeof candidate !== 'object') continue;
    const feature = candidate as { geometry?: GeoJsonGeometry; properties?: Record<string, unknown> };
    if (!feature.geometry) continue;
    stored.push({
      geometry: feature.geometry,
      properties: feature.properties,
    });
  }

  return stored;
}
