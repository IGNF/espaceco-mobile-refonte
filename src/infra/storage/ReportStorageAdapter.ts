/**
 * ReportStorageAdapter
 *
 * Implements IReportStorage from @ign/mobile-core
 * Uses @ign/mobile-device Storage and FileSystem for persistence
 *
 * Storage strategy:
 * - Reports: Storage (JSON in Preferences, keyed by reportId)
 * - Photos: FileSystem (binary blobs in DATA directory)
 * - Params: Storage (transient parameters in Preferences)
 */
import type { IReportStorage, Report, ReportPhoto } from '@ign/mobile-core';
import { Storage, FileSystem } from '@ign/mobile-device';
import Feature from 'ol/Feature';
import GeoJSON from 'ol/format/GeoJSON';
import { storageKey } from '../../shared/constants/storage';
import {
  WEB_MERCATOR_PROJECTION,
  WGS84_PROJECTION,
} from '../../shared/constants/projections';

const REPORTS_KEY = 'REPORTS';
const REPORT_PARAMS_KEY = 'REPORT_PARAMS';
const PHOTOS_DIR = 'report_photos';
const reportFeatureFormat = new GeoJSON();
const REPORT_FEATURE_SERIALIZATION_OPTIONS = {
  featureProjection: WEB_MERCATOR_PROJECTION,
  dataProjection: WGS84_PROJECTION,
} as const;

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToBlob(base64Data: string, mimeType: string): Blob {
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
}

function serializeReportFeatures(features?: Report['features']): unknown {
  if (!Array.isArray(features) || features.length === 0) {
    return undefined;
  }

  const serializableFeatures = features.filter(
    (feature): feature is Feature => feature instanceof Feature
  );

  if (serializableFeatures.length === 0) {
    return undefined;
  }

  return reportFeatureFormat.writeFeaturesObject(
    serializableFeatures,
    REPORT_FEATURE_SERIALIZATION_OPTIONS
  );
}

function deserializeReportFeatures(rawFeatures: unknown): Report['features'] {
  if (!rawFeatures) {
    return [];
  }

  try {
    if (Array.isArray(rawFeatures)) {
      return reportFeatureFormat.readFeatures(
        {
          type: 'FeatureCollection',
          features: rawFeatures,
        },
        REPORT_FEATURE_SERIALIZATION_OPTIONS
      );
    }

    if (typeof rawFeatures === 'object') {
      return reportFeatureFormat.readFeatures(
        rawFeatures as object,
        REPORT_FEATURE_SERIALIZATION_OPTIONS
      );
    }
  } catch (error) {
    console.warn('[ReportStorageAdapter] Failed to deserialize report features', error);
  }

  return [];
}

export class ReportStorageAdapter implements IReportStorage {
  // Parameter operations

  async loadParams(key: string): Promise<any> {
    const allParams = await this.getAllParams();
    return allParams[key] ?? null;
  }

  async saveParam(param: any): Promise<void> {
    await Storage.set(storageKey(REPORT_PARAMS_KEY), param, 'object');
  }

  async getParam(): Promise<any> {
    return await Storage.get(storageKey(REPORT_PARAMS_KEY), 'object');
  }

  async clearParam(): Promise<void> {
    await Storage.remove(storageKey(REPORT_PARAMS_KEY));
  }

  private async getAllParams(): Promise<Record<string, any>> {
    const data = await Storage.get(storageKey(REPORT_PARAMS_KEY), 'object');
    return data ?? {};
  }

  // Report CRUD operations

  async saveReport(report: Report): Promise<void> {
    const allReports = await this.getAllReports();
    const previousPhotos = (allReports[report.id]?.photos ?? []) as ReportPhoto[];
    await this.deleteRemovedPhotoFiles(previousPhotos, report.photos ?? []);

    // Serialize dates and OpenLayers features for storage
    const serializable = {
      ...report,
      createdAt: report.createdAt instanceof Date ? report.createdAt.toISOString() : report.createdAt,
      modifiedAt: report.modifiedAt instanceof Date ? report.modifiedAt.toISOString() : report.modifiedAt,
      features: serializeReportFeatures(report.features),
    };
    allReports[report.id] = serializable;
    await Storage.set(storageKey(REPORTS_KEY), allReports, 'object');
  }

  async getReport(reportId: number): Promise<Report | null> {
    const allReports = await this.getAllReports();
    const data = allReports[reportId];
    if (!data) return null;
    return this.deserializeReport(data);
  }

  async deleteReport(reportId: number): Promise<void> {
    const allReports = await this.getAllReports();
    const report = allReports[reportId];

    // Delete associated photos if any
    if (report?.photos) {
      for (const photo of report.photos) {
        if (photo.localPath) {
          await this.deletePhotoFile(photo.localPath);
        }
      }
    }

    delete allReports[reportId];
    await Storage.set(storageKey(REPORTS_KEY), allReports, 'object');
  }

  async listReports(): Promise<Report[]> {
    const allReports = await this.getAllReports();
    return Object.values(allReports).map(data => this.deserializeReport(data));
  }

  // Photo operations

  async getBlob(photo: ReportPhoto): Promise<Blob> {
    if (!photo.localPath) {
      throw new Error('Photo has no local path');
    }

    try {
      const base64Data = await FileSystem.readFile({
        path: photo.localPath,
        directory: 'DATA',
        encoding: 'base64',
      });

      // Determine MIME type from extension as API expects image blobs.
      const ext = photo.localPath.split('.').pop()?.toLowerCase() ?? 'jpg';
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
      return base64ToBlob(base64Data, mimeType);
    } catch (error) {
      console.error(`Failed to read photo: ${photo.localPath}`, error);
      throw new Error(`Failed to read photo: ${photo.localPath}`);
    }
  }

  // Helper methods

  private async getAllReports(): Promise<Record<number, any>> {
    const data = await Storage.get(storageKey(REPORTS_KEY), 'object');
    return data ?? {};
  }

  private async deletePhotoFile(path: string): Promise<void> {
    try {
      await FileSystem.deleteFile({
        path,
        directory: 'DATA',
      });
    } catch {
      console.log(`Photo ${path} not found`);
    }
  }

  private async deleteRemovedPhotoFiles(previousPhotos: ReportPhoto[], nextPhotos: ReportPhoto[]): Promise<void> {
    const currentPaths = new Set(
      nextPhotos
        .map(photo => photo.localPath)
        .filter((path): path is string => typeof path === 'string')
    );

    for (const photo of previousPhotos) {
      if (!photo.localPath || currentPaths.has(photo.localPath)) continue;
      await this.deletePhotoFile(photo.localPath);
    }
  }

  private deserializeReport(data: any): Report {
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      modifiedAt: data.modifiedAt ? new Date(data.modifiedAt) : undefined,
      features: deserializeReportFeatures(data.features),
    } as Report;
  }

  // Additional utility methods

  /**
   * Save a photo blob to the filesystem and return the local path
   */
  async savePhotoBlob(reportId: number, photoIndex: number, blob: Blob): Promise<string> {
    const ext = blob.type === 'image/png' ? 'png' : 'jpg';
    const path = `${PHOTOS_DIR}/${reportId}_${photoIndex}.${ext}`;
    const base64Data = await blobToBase64(blob);

    await FileSystem.writeFile({
      path,
      data: base64Data,
      directory: 'DATA',
      encoding: 'base64',
      recursive: true,
    });

    return path;
  }

  /**
   * Get all reports for a specific community
   */
  async getReportsByCommunity(communityId: number): Promise<Report[]> {
    const allReports = await this.listReports();
    return allReports.filter(report => report.communityId === communityId);
  }

  /**
   * Get pending reports (not yet submitted to server)
   */
  async getPendingReports(): Promise<Report[]> {
    const allReports = await this.listReports();
    return allReports.filter(report =>
      report.status === 'pending' ||
      report.status === 'pending0' ||
      report.status === 'pending1' ||
      report.status === 'pending2'
    );
  }
}
