import { Storage } from '@ign/mobile-device';
import { storageKey } from '@/shared/constants/storage';
import { AppError } from '@/shared/errors/appError';
import { toBoolean, toRawObject, toStringValue } from '@/shared/utils/coercion';

export type GpsSourceType = 'internal' | 'external';

export interface GpsSourceInfo {
  type: GpsSourceType;
  name?: string;
  id?: string;
  identifier?: string;
  typeIsGuess?: boolean;
}

export type GpsSourceErrorCode =
  | 'notAvailable'
  | 'unsupportedOnPlatform'
  | 'noPairedDevice'
  | 'selectionCanceled'
  | 'connectionFailed'
  | 'unknown';

export class GpsSourceError extends AppError {
  override readonly code: GpsSourceErrorCode;

  constructor(code: GpsSourceErrorCode, message: string, cause?: unknown) {
    super({
      kind: 'unknown',
      translationKey: `settings.gps.errors.${code}`,
      message,
      code,
      retryable: false,
      cause,
    });
    this.name = 'GpsSourceError';
    this.code = code;
  }
}

const GPS_SOURCE_STORAGE_KEY = storageKey('GPS_SOURCE');
const DEFAULT_GPS_SOURCE: GpsSourceType = 'internal';

let deviceReadyPromise: Promise<void> | null = null;
let currentSource: GpsSourceInfo = { type: DEFAULT_GPS_SOURCE };
let restorePromise: Promise<GpsSourceInfo> | null = null;
let hasRestoredPreferredSource = false;

function getGeolocationPlugin(): Geolocation | null {
  if (typeof navigator === 'undefined') return null;
  return navigator.geolocation ?? null;
}

function hasSourceAwareGeolocation(): boolean {
  const geolocation = getGeolocationPlugin();
  if (!geolocation) return false;
  return Boolean(geolocation.hasSource || typeof geolocation.setSource === 'function');
}

function normalizeSourceInfo(source: unknown, fallbackType: GpsSourceType): GpsSourceInfo {
  const sourceInfo = toRawObject(source);
  if (!sourceInfo) {
    return { type: fallbackType };
  }

  const normalizedType = sourceInfo.type === 'external' ? 'external' : fallbackType;

  return {
    type: normalizedType,
    name: toStringValue(sourceInfo.name),
    id: toStringValue(sourceInfo.id),
    identifier: toStringValue(sourceInfo.identifier),
    typeIsGuess: toBoolean(sourceInfo.typeIsGuess),
  };
}

function mapPluginError(error: unknown): GpsSourceError {
  const message = String(error ?? '').trim();
  const normalized = message.toLowerCase();

  if (normalized.includes('cannot change gps source')) {
    return new GpsSourceError('unsupportedOnPlatform', message, error);
  }
  if (normalized.includes('no paired devices found')) {
    return new GpsSourceError('noPairedDevice', message, error);
  }
  if (normalized.includes('no device selected')) {
    return new GpsSourceError('selectionCanceled', message, error);
  }
  if (
    normalized.includes('impossible de se connecter') ||
    normalized.includes('failed') ||
    normalized.includes('connect')
  ) {
    return new GpsSourceError('connectionFailed', message, error);
  }
  if (normalized.includes('unknown source type') || normalized.includes('setsource')) {
    return new GpsSourceError('notAvailable', message, error);
  }

  return new GpsSourceError('unknown', message || 'Unknown GPS source error', error);
}

async function waitForSourcePluginReady(): Promise<void> {
  const geolocation = getGeolocationPlugin();
  if (geolocation && typeof geolocation.setSource === 'function') {
    return;
  }

  // Following lines are just in case
  // In theory, the plugin is already ready at this point
  if (typeof document === 'undefined') return;
  if (typeof window === 'undefined' || !window.cordova) return;

  if (!deviceReadyPromise) {
    deviceReadyPromise = new Promise((resolve) => {
      let settled = false;

      const done = () => {
        if (settled) return;
        settled = true;
        resolve();
      };

      document.addEventListener('deviceready', done, { once: true });
      window.setTimeout(done, 1800);
    });
  }

  await deviceReadyPromise;
}

async function persistPreferredSource(sourceType: GpsSourceType): Promise<void> {
  await Storage.set(GPS_SOURCE_STORAGE_KEY, sourceType);
}

async function readPreferredSource(): Promise<GpsSourceType> {
  const storedSource = await Storage.get(GPS_SOURCE_STORAGE_KEY);
  return storedSource === 'external' ? 'external' : 'internal';
}

function cloneSourceInfo(source: GpsSourceInfo): GpsSourceInfo {
  return { ...source };
}

function updateCurrentSource(source: GpsSourceInfo): GpsSourceInfo {
  currentSource = cloneSourceInfo(source);
  return cloneSourceInfo(currentSource);
}

/**
 * Tries to apply the internal source at plugin level.
 */
async function switchToInternalSourceBestEffort(): Promise<GpsSourceInfo> {
  if (hasSourceAwareGeolocation()) {
    try {
      return await applySource('internal');
    } catch (error) {
      console.error('[GPS source] Failed to apply internal source, fallback to internal', error);
    }
  }

  return updateCurrentSource({ type: 'internal' });
}

/**
 * Applies the requested source using the plugin and updates in-memory source info.
 */
async function applySource(sourceType: GpsSourceType): Promise<GpsSourceInfo> {
  await waitForSourcePluginReady();

  const geolocation = getGeolocationPlugin();
  if (!geolocation || typeof geolocation.setSource !== 'function') {
    if (sourceType === 'internal') {
      return updateCurrentSource({ type: 'internal' });
    }
    throw new GpsSourceError('notAvailable', 'GPS source plugin is not available');
  }

  return await new Promise<GpsSourceInfo>((resolve, reject) => {
    geolocation.setSource?.(
      sourceType,
      (sourceInfo) => {
        resolve(updateCurrentSource(normalizeSourceInfo(sourceInfo, sourceType)));
      },
      (error) => {
        reject(mapPluginError(error));
      }
    );
  });
}

export class EspaceCo_GpsSource {
  /**
   * Returns the currently active GPS source info kept in memory.
   */
  static getCurrentSource(): GpsSourceInfo {
    return cloneSourceInfo(currentSource);
  }

  static isAvailable(): boolean {
    return hasSourceAwareGeolocation();
  }

  /**
   * Whether the plugin reports that GPS source switching can be changed
   */
  static canSetSource(): boolean {
    const geolocation = getGeolocationPlugin();
    return Boolean(geolocation?.canSetSource);
  }

  static normalizeError(error: unknown): GpsSourceError {
    if (error instanceof GpsSourceError) {
      return error;
    }
    return mapPluginError(error);
  }

  /**
   * Returns persisted preferred source ('internal' by default).
   */
  static async getPreferredSource(): Promise<GpsSourceType> {
    return await readPreferredSource();
  }

  /**
   * Applies a GPS source and persists it as preferred source.
   */
  static async setSource(sourceType: GpsSourceType): Promise<GpsSourceInfo> {
    const source = await applySource(sourceType);
    await persistPreferredSource(source.type);
    return source;
  }

  /**
   * Restore the persisted source once on startup.
   */
  static async restorePreferredSource(): Promise<GpsSourceInfo> {
    if (hasRestoredPreferredSource) {
      return cloneSourceInfo(currentSource);
    }

    if (restorePromise) {
      return await restorePromise;
    }

    restorePromise = (async () => {
      const preferredSource = await readPreferredSource();

      if (preferredSource === 'external') {
        try {
          return await EspaceCo_GpsSource.setSource('external');
        } catch (error) {
          console.warn('[GPS source] Failed to restore external source, fallback to internal', error);
          await persistPreferredSource('internal');
          return await switchToInternalSourceBestEffort();
        }
      }

      return await switchToInternalSourceBestEffort();
    })();

    try {
      const source = await restorePromise;
      hasRestoredPreferredSource = true;
      return source;
    } finally {
      restorePromise = null;
    }
  }
}
