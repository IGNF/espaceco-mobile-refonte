import { Storage } from '@ign/mobile-device';

import {
  DEFAULT_FAST_REPORT_GPS_SETTINGS,
  type FastReportGpsSettings,
} from '@/features/report/constants/fastReportGps.constants';
import { DEFAULT_TRACE_RECORDING_SETTINGS, type TraceRecordingSettings } from '@/features/report/constants/reportTrace.constants';

import { storageKey } from '@/shared/constants/storage';
import { toRawObject } from '@/shared/utils/coercion';
import { readFiniteNumber, readNonNegativeNumber } from '@/shared/utils/number';
import type { MapSettings } from '@/domain/map/models';
import type { DisplayMode } from '@/domain/user/models';

const TRACE_RECORDING_SETTINGS_KEY = storageKey('TRACE_RECORDING_SETTINGS');
const FAST_REPORT_GPS_SETTINGS_KEY = storageKey('FAST_REPORT_GPS_SETTINGS');
const MAP_SETTINGS_KEY = 'MAP_SETTINGS';
const DISPLAY_MODE_KEY = 'DISPLAY_MODE';
const DEFAULT_DISPLAY_MODE: DisplayMode = 'beginner';

function normalizeTraceRecordingSettings(rawSettings: unknown): TraceRecordingSettings {
  const candidate = toRawObject(rawSettings);
  const candidateToleranceByMode = toRawObject(candidate?.toleranceByMode);
  const legacyTolerance = candidateToleranceByMode?.car ?? candidateToleranceByMode?.pedestrian;

  return {
    minAccuracy: readNonNegativeNumber(
      candidate?.minAccuracy,
      DEFAULT_TRACE_RECORDING_SETTINGS.minAccuracy
    ),
    tolerance: readNonNegativeNumber(
      candidate?.tolerance ?? legacyTolerance,
      DEFAULT_TRACE_RECORDING_SETTINGS.tolerance
    ),
  };
}

function normalizeFastReportOffsetSettings(
  rawSettings: unknown,
  fallbackSettings = DEFAULT_FAST_REPORT_GPS_SETTINGS.offsetByMode.car
) {
  const candidate = toRawObject(rawSettings);
  const candidatePlanimetric = toRawObject(candidate?.planimetric);
  const candidateAltimetric = toRawObject(candidate?.altimetric);

  return {
    planimetric: {
      enabled: Boolean(candidatePlanimetric?.enabled ?? fallbackSettings.planimetric.enabled),
      value: readFiniteNumber(candidatePlanimetric?.value, fallbackSettings.planimetric.value),
    },
    altimetric: {
      enabled: Boolean(candidateAltimetric?.enabled ?? fallbackSettings.altimetric.enabled),
      value: readFiniteNumber(candidateAltimetric?.value, fallbackSettings.altimetric.value),
    },
  };
}

function normalizeFastReportGpsSettings(rawSettings: unknown): FastReportGpsSettings {
  const candidate = toRawObject(rawSettings);
  const candidateOffsetByMode = toRawObject(candidate?.offsetByMode);
  const candidateToleranceByMode = toRawObject(candidate?.toleranceByMode);

  return {
    offsetByMode: {
      pedestrian: normalizeFastReportOffsetSettings(
        candidateOffsetByMode?.pedestrian,
        DEFAULT_FAST_REPORT_GPS_SETTINGS.offsetByMode.pedestrian
      ),
      car: normalizeFastReportOffsetSettings(
        candidateOffsetByMode?.car,
        DEFAULT_FAST_REPORT_GPS_SETTINGS.offsetByMode.car
      ),
    },
    toleranceByMode: {
      pedestrian: readNonNegativeNumber(
        candidateToleranceByMode?.pedestrian,
        DEFAULT_FAST_REPORT_GPS_SETTINGS.toleranceByMode.pedestrian
      ),
      car: readNonNegativeNumber(
        candidateToleranceByMode?.car,
        DEFAULT_FAST_REPORT_GPS_SETTINGS.toleranceByMode.car
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
    isOnlineVectorCacheEnabled: Boolean(candidate?.isOnlineVectorCacheEnabled ?? true),
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
   * Fast Report GPS Settings
   */

  static async getFastReportGpsSettings(): Promise<FastReportGpsSettings> {
    return normalizeFastReportGpsSettings(
      await Storage.get(FAST_REPORT_GPS_SETTINGS_KEY, 'object')
    );
  }

  static async saveFastReportGpsSettings(
    settings: FastReportGpsSettings
  ): Promise<FastReportGpsSettings> {
    const normalizedSettings = normalizeFastReportGpsSettings(settings);
    await Storage.set(FAST_REPORT_GPS_SETTINGS_KEY, normalizedSettings, 'object');
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
