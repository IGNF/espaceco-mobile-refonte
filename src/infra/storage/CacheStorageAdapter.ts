/**
 * CacheStorageAdapter
 *
 * Implements ICacheStorage from @ign/mobile-core
 * Uses @ign/mobile-device FileSystem and Storage for persistence
 *
 * Storage strategy:
 * - Tiles: FileSystem (binary blobs in CACHE directory)
 * - Metadata: Storage (JSON in Preferences)
 * - Features: FileSystem (GeoJSON in DATA directory)
 */
import type { ICacheStorage, CacheMetadata } from '@ign/mobile-core';
import { Feature } from 'ol';
import GeoJSON from 'ol/format/GeoJSON';
import { Storage, FileSystem } from '@ign/mobile-device';
import { storageKey } from '../../shared/constants/storage';

const CACHE_DIR = 'tiles';
const FEATURES_DIR = 'features';
const METADATA_KEY = 'CACHE_METADATA';

export class CacheStorageAdapter implements ICacheStorage {
  private geoJSON: GeoJSON;

  constructor() {
    this.geoJSON = new GeoJSON();
  }

  // Tile operations

  async saveTile(key: string, data: Blob): Promise<void> {
    const path = `${CACHE_DIR}/${key}`;
    await FileSystem.writeFile({
      path,
      data,
      directory: 'CACHE',
      recursive: true,
    });
  }

  async getTile(key: string): Promise<Blob | null> {
    try {
      const path = `${CACHE_DIR}/${key}`;
      const data = await FileSystem.readFile({
        path,
        directory: 'CACHE',
        encoding: 'base64',
      });
      // Convert base64 string back to Blob
      const byteCharacters = atob(data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      return new Blob([byteArray]);
    } catch {
      return null;
    }
  }

  async deleteTile(key: string): Promise<void> {
    try {
      const path = `${CACHE_DIR}/${key}`;
      await FileSystem.deleteFile({
        path,
        directory: 'CACHE',
      });
    } catch {
      console.log(`Tile ${key} not found`);
    }
  }

  async listTiles(prefix: string): Promise<string[]> {
    try {
      const path = `${CACHE_DIR}/${prefix}`;
      const entries = await FileSystem.listDirectory({
        path,
        directory: 'CACHE',
      });
      return entries
        .filter(entry => !entry.isDirectory)
        .map(entry => `${prefix}/${entry.name}`);
    } catch {
      return [];
    }
  }

  // Metadata operations

  async saveMetadata(key: string, data: CacheMetadata): Promise<void> {
    const allMetadata = await this.getAllMetadata();
    // Serialize dates for storage
    const serializable = {
      ...data,
      created: data.created instanceof Date ? data.created.toISOString() : data.created,
      modified: data.modified instanceof Date ? data.modified.toISOString() : data.modified,
    };
    allMetadata[key] = serializable;
    await Storage.set(storageKey(METADATA_KEY), allMetadata, 'object');
  }

  async getMetadata(key: string): Promise<CacheMetadata | null> {
    const allMetadata = await this.getAllMetadata();
    const data = allMetadata[key];
    if (!data) return null;
    // Deserialize dates
    return {
      ...data,
      created: new Date(data.created),
      modified: new Date(data.modified),
    } as CacheMetadata;
  }

  async deleteMetadata(key: string): Promise<void> {
    const allMetadata = await this.getAllMetadata();
    delete allMetadata[key];
    await Storage.set(storageKey(METADATA_KEY), allMetadata, 'object');
  }

  async listMetadata(prefix: string): Promise<CacheMetadata[]> {
    const allMetadata = await this.getAllMetadata();
    return Object.entries(allMetadata)
      .filter(([key]) => key.startsWith(prefix))
      .map(([, value]) => ({
        ...value,
        created: new Date(value.created),
        modified: new Date(value.modified),
      })) as CacheMetadata[];
  }

  private async getAllMetadata(): Promise<Record<string, any>> {
    const data = await Storage.get(storageKey(METADATA_KEY), 'object');
    return data ?? {};
  }

  // Feature operations

  async saveFeatures(layerId: string, features: Feature[]): Promise<void> {
    const path = `${FEATURES_DIR}/${layerId}.geojson`;
    const geojsonStr = this.geoJSON.writeFeatures(features);
    await FileSystem.writeFile({
      path,
      data: geojsonStr,
      directory: 'DATA',
      encoding: 'utf8',
      recursive: true,
    });
  }

  async loadFeatures(layerId: string): Promise<Feature[]> {
    try {
      const path = `${FEATURES_DIR}/${layerId}.geojson`;
      const data = await FileSystem.readFile({
        path,
        directory: 'DATA',
        encoding: 'utf8',
      });
      return this.geoJSON.readFeatures(data) as Feature[];
    } catch {
      return [];
    }
  }

  async deleteFeatures(layerId: string): Promise<void> {
    try {
      const path = `${FEATURES_DIR}/${layerId}.geojson`;
      await FileSystem.deleteFile({
        path,
        directory: 'DATA',
      });
    } catch {
      console.log(`Features ${layerId} not found`);
    }
  }

  // Space management

  async clear(): Promise<void> {
    // Clear tiles
    try {
      await FileSystem.removeDirectory({
        path: CACHE_DIR,
        directory: 'CACHE',
        recursive: true,
      });
    } catch {
      console.log(`Cache directory not found`);
    }

    // Clear features
    try {
      await FileSystem.removeDirectory({
        path: FEATURES_DIR,
        directory: 'DATA',
        recursive: true,
      });
    } catch {
      console.log(`Features directory not found`);
    }

    // Clear metadata
    await Storage.remove(storageKey(METADATA_KEY));
  }

  async getUsedSpace(): Promise<number> {
    let totalSize = 0;

    // Calculate tiles size
    try {
      const tileEntries = await this.listDirectoryRecursive(CACHE_DIR, 'CACHE');
      for (const entry of tileEntries) {
        if (!entry.isDirectory && entry.size) {
          totalSize += entry.size;
        }
      }
    } catch {
      console.log(`Cache directory not found`);
    }

    // Calculate features size
    try {
      const featureEntries = await FileSystem.listDirectory({
        path: FEATURES_DIR,
        directory: 'DATA',
      });
      for (const entry of featureEntries) {
        if (!entry.isDirectory && entry.size) {
          totalSize += entry.size;
        }
      }
    } catch {
      console.log(`Features directory not found`);
    }

    return totalSize;
  }

  /**
   * Not implemented yet
   * We can use the https://github.com/capacitor-community/device plugin
   * But we have to create a PrivacyInfo.xcprivacy file for that (see documentation) required by Apple
   */
  async getFreeSpace(): Promise<number> {
    return 0;
  }

  private async listDirectoryRecursive(
    path: string,
    directory: 'CACHE' | 'DATA'
  ): Promise<Array<{ name: string; isDirectory: boolean; size?: number }>> {
    const results: Array<{ name: string; isDirectory: boolean; size?: number }> = [];
    try {
      const entries = await FileSystem.listDirectory({ path, directory });
      for (const entry of entries) {
        results.push(entry);
        if (entry.isDirectory) {
          const subEntries = await this.listDirectoryRecursive(
            `${path}/${entry.name}`,
            directory
          );
          results.push(...subEntries);
        }
      }
    } catch {
      console.log(`Directory ${path} not found`);
    }
    return results;
  }
}
