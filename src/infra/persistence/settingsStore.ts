import { Storage } from '@ign/mobile-device';

import { DEFAULT_TRACE_RECORDING_SETTINGS, type TraceRecordingSettings } from '@/features/report/constants/reportTrace.constants';

import { storageKey } from '@/shared/constants/storage';
import { toRawObject } from '@/shared/utils/coercion';
import { readNonNegativeNumber } from '@/shared/utils/number';
import type { MapSettings } from '@/domain/map/models';

const TRACE_RECORDING_SETTINGS_KEY = storageKey('TRACE_RECORDING_SETTINGS');
const MAP_SETTINGS_KEY = storageKey('MAP_SETTINGS');

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

  static async getMapSettings(): Promise<MapSettings> {
    return normalizeMapSettings(await Storage.get(MAP_SETTINGS_KEY, 'object'));
  }

  static async saveMapSettings(settings: MapSettings): Promise<MapSettings> {
    const normalizedSettings = normalizeMapSettings(settings);
    await Storage.set(MAP_SETTINGS_KEY, normalizedSettings, 'object');
    return normalizedSettings;
  }
}
