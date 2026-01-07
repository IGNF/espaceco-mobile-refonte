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
import { storageKey } from '../../shared/constants/storage';

const REPORTS_KEY = 'REPORTS';
const REPORT_PARAMS_KEY = 'REPORT_PARAMS';
const PHOTOS_DIR = 'report_photos';

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
    // Serialize dates and features for storage
    const serializable = {
      ...report,
      createdAt: report.createdAt instanceof Date ? report.createdAt.toISOString() : report.createdAt,
      modifiedAt: report.modifiedAt instanceof Date ? report.modifiedAt.toISOString() : report.modifiedAt,
      // Features are OpenLayers objects - store as GeoJSON or skip
      features: undefined, // Features should be stored separately if needed
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
          try {
            await FileSystem.deleteFile({
              path: photo.localPath,
              directory: 'DATA',
            });
          } catch {
            console.log(`Photo ${photo.localPath} not found`);
          }
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
      const data = await FileSystem.readFile({
        path: photo.localPath,
        directory: 'DATA',
        encoding: 'base64',
      });
      // Convert base64 string to Blob
      const byteCharacters = atob(data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      // Try to determine MIME type from path extension
      const ext = photo.localPath.split('.').pop()?.toLowerCase() ?? 'jpg';
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
      return new Blob([byteArray], { type: mimeType });
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

  private deserializeReport(data: any): Report {
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      modifiedAt: data.modifiedAt ? new Date(data.modifiedAt) : undefined,
      features: [], // Features need to be loaded separately if needed
    } as Report;
  }

  // Additional utility methods

  /**
   * Save a photo blob to the filesystem and return the local path
   */
  async savePhotoBlob(reportId: number, photoIndex: number, blob: Blob): Promise<string> {
    const ext = blob.type === 'image/png' ? 'png' : 'jpg';
    const path = `${PHOTOS_DIR}/${reportId}_${photoIndex}.${ext}`;

    await FileSystem.writeFile({
      path,
      data: blob,
      directory: 'DATA',
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
