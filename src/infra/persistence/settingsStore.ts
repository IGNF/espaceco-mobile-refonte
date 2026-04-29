import { Storage } from '@ign/mobile-device';

import { DEFAULT_TRACE_RECORDING_SETTINGS, type TraceRecordingSettings } from '@/features/report/constants/reportTrace.constants';

import { storageKey } from '@/shared/constants/storage';
import { toRawObject } from '@/shared/utils/coercion';
import { readNonNegativeNumber } from '@/shared/utils/number';
import type { MapSettings } from '@/domain/map/models';
import type { DisplayMode } from '@/domain/user/models';

const TRACE_RECORDING_SETTINGS_KEY = storageKey('TRACE_RECORDING_SETTINGS');
const MAP_SETTINGS_KEY = 'MAP_SETTINGS';
const DISPLAY_MODE_KEY = 'DISPLAY_MODE';
const DEFAULT_DISPLAY_MODE: DisplayMode = 'beginner';

function normalizeTraceRecordingSettings(rawSettings: unknown): TraceRecordingSettings {
  const candidate = toRawObject(rawSettings);
  const candidateToleranceByMode = toRawObject(candidate?.toleranceByMode);

  return {
    minAccuracy: readNonNegativeNumber(
      candidate?.minAccuracy,
      DEFAULT_TRACE_RECORDING_SETTINGS.minAccuracy
    ),
    toleranceByMode: {
      pedestrian: readNonNegativeNumber(
        candidateToleranceByMode?.pedestrian,
        DEFAULT_TRACE_RECORDING_SETTINGS.toleranceByMode.pedestrian
      ),
      car: readNonNegativeNumber(
        candidateToleranceByMode?.car,
        DEFAULT_TRACE_RECORDING_SETTINGS.toleranceByMode.car
      ),
    },
  };
}

function normalizeMapSettings(rawSettings: unknown): MapSettings {
  const candidate = toRawObject(rawSettings);
  return {
    isZoomEnabled: Boolean(candidate?.isZoomEnabled ?? true),
    isRotationEnabled: Boolean(candidate?.isRotationEnabled ?? true),
    isSearchEnabled: Boolean(candidate?.isSearchEnabled ?? true),
  };
}

export class EspaceCo_SettingsStore {
  /**
   * Trace Recording Settings
   */

  static async getTraceRecordingSettings(): Promise<TraceRecordingSettings> {
    return normalizeTraceRecordingSettings(
      await Storage.get(TRACE_RECORDING_SETTINGS_KEY, 'object')
    );
  }

  static async saveTraceRecordingSettings(
    settings: TraceRecordingSettings
  ): Promise<TraceRecordingSettings> {
    const normalizedSettings = normalizeTraceRecordingSettings(settings);
    await Storage.set(TRACE_RECORDING_SETTINGS_KEY, normalizedSettings, 'object');
    return normalizedSettings;
  }

  /**
   * Map Settings
   */

  static async getMapSettings(userId: number): Promise<MapSettings> {
    return normalizeMapSettings(
      await Storage.get(storageKey(`${MAP_SETTINGS_KEY}_${userId}`), 'object')
    );
  }

  static async saveMapSettings(userId: number, settings: MapSettings): Promise<MapSettings> {
    const normalizedSettings = normalizeMapSettings(settings);
    await Storage.set(storageKey(`${MAP_SETTINGS_KEY}_${userId}`), normalizedSettings, 'object');
    return normalizedSettings;
  }

  /**
   * Display Mode Settings
   */

  static async getDisplayMode(userId: number): Promise<DisplayMode> {
    const mode = await Storage.get(storageKey(`${DISPLAY_MODE_KEY}_${userId}`), 'string');
    return mode ?? DEFAULT_DISPLAY_MODE;
  }

  static async saveDisplayMode(userId: number, mode: DisplayMode): Promise<void> {
    await Storage.set(storageKey(`${DISPLAY_MODE_KEY}_${userId}`), mode, 'string');
  }
}
