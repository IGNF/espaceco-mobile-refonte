import { useEffect, useState } from 'react';

import {
  EspaceCo_GpsSource,
  type GpsSourceErrorCode,
  type GpsSourceInfo,
  type GpsSourceType,
} from '@/platform/device/gpsSource';

import type { TraceRecordingSettings } from '@/features/report/constants/reportTrace.constants';
import { useAppSettings } from '@/features/settings/hooks/useAppSettings';

import { isNonNegativeFinite, parseDecimalInput } from '@/shared/utils/number';

export interface UseSettingsReturn {
  pendingGpsSourceType: GpsSourceType;
  activeGpsSourceInfo: GpsSourceInfo;
  isGpsSourcePluginAvailable: boolean;
  canSetGpsSource: boolean;
  isLoading: boolean;
  isApplyingGpsSource: boolean;
  isApplyingTraceSettings: boolean;
  gpsSourceErrorCode: GpsSourceErrorCode | null;
  traceSettingsErrorCode: 'invalidNumber' | null;
  traceMinAccuracyInput: string;
  traceTolerancePedestrianInput: string;
  traceToleranceCarInput: string;
  setPendingGpsSourceType: (source: GpsSourceType) => void;
  setTraceMinAccuracyInput: (value: string) => void;
  setTraceTolerancePedestrianInput: (value: string) => void;
  setTraceToleranceCarInput: (value: string) => void;
  applyGpsSource: () => Promise<boolean>;
  applyTraceSettings: () => Promise<boolean>;
}

export function useSettings(): UseSettingsReturn {
  const { traceRecordingSettings, setTraceRecordingSettings } = useAppSettings();
  const [pendingGpsSourceType, setPendingGpsSourceType] = useState<GpsSourceType>('internal');
  const [activeGpsSourceInfo, setActiveGpsSourceInfo] = useState<GpsSourceInfo>({ type: 'internal' });
  const [isGpsSourcePluginAvailable, setIsGpsSourcePluginAvailable] = useState(false);
  const [canSetGpsSource, setCanSetGpsSource] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplyingGpsSource, setIsApplyingGpsSource] = useState(false);
  const [isApplyingTraceSettings, setIsApplyingTraceSettings] = useState(false);
  const [gpsSourceErrorCode, setGpsSourceErrorCode] = useState<GpsSourceErrorCode | null>(null);
  const [traceSettingsErrorCode, setTraceSettingsErrorCode] = useState<'invalidNumber' | null>(null);
  const [traceMinAccuracyInput, setTraceMinAccuracyInput] = useState(String(traceRecordingSettings.minAccuracy));
  const [traceTolerancePedestrianInput, setTraceTolerancePedestrianInput] = useState(
    String(traceRecordingSettings.toleranceByMode.pedestrian)
  );
  const [traceToleranceCarInput, setTraceToleranceCarInput] = useState(
    String(traceRecordingSettings.toleranceByMode.car)
  );

  const setTraceInputValues = (settings: TraceRecordingSettings): void => {
    setTraceMinAccuracyInput(String(settings.minAccuracy));
    setTraceTolerancePedestrianInput(String(settings.toleranceByMode.pedestrian));
    setTraceToleranceCarInput(String(settings.toleranceByMode.car));
  };

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    void (async () => {
      try {
        await EspaceCo_GpsSource.restorePreferredSource();
        const preferredSource = await EspaceCo_GpsSource.getPreferredSource();

        if (!isMounted) return;

        setIsGpsSourcePluginAvailable(EspaceCo_GpsSource.isAvailable());
        setCanSetGpsSource(EspaceCo_GpsSource.canSetSource());
        setActiveGpsSourceInfo(EspaceCo_GpsSource.getCurrentSource());
        setPendingGpsSourceType(preferredSource);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setTraceInputValues(traceRecordingSettings);
  }, [traceRecordingSettings]);

  const applyGpsSource = async (): Promise<boolean> => {
    setGpsSourceErrorCode(null);
    setIsApplyingGpsSource(true);

    try {
      const source = await EspaceCo_GpsSource.setSource(pendingGpsSourceType);
      setActiveGpsSourceInfo(source);
      setPendingGpsSourceType(source.type);
      return true;
    } catch (error) {
      setGpsSourceErrorCode(EspaceCo_GpsSource.normalizeError(error).code);
      return false;
    } finally {
      setIsApplyingGpsSource(false);
    }
  };

  const applyTraceSettings = async (): Promise<boolean> => {
    setTraceSettingsErrorCode(null);
    setIsApplyingTraceSettings(true);

    try {
      const minAccuracy = parseDecimalInput(traceMinAccuracyInput);
      const tolerancePedestrian = parseDecimalInput(traceTolerancePedestrianInput);
      const toleranceCar = parseDecimalInput(traceToleranceCarInput);
      const parsedSettings: TraceRecordingSettings = {
        minAccuracy,
        toleranceByMode: {
          pedestrian: tolerancePedestrian,
          car: toleranceCar,
        },
      };

      const allValuesAreValid = [
        parsedSettings.minAccuracy,
        parsedSettings.toleranceByMode.pedestrian,
        parsedSettings.toleranceByMode.car,
      ].every(isNonNegativeFinite);

      if (!allValuesAreValid) {
        setTraceSettingsErrorCode('invalidNumber');
        return false;
      }

      await setTraceRecordingSettings(parsedSettings);
      setTraceInputValues(parsedSettings);
      return true;
    } finally {
      setIsApplyingTraceSettings(false);
    }
  };

  return {
    pendingGpsSourceType,
    activeGpsSourceInfo,
    isGpsSourcePluginAvailable,
    canSetGpsSource,
    isLoading,
    isApplyingGpsSource,
    isApplyingTraceSettings,
    gpsSourceErrorCode,
    traceSettingsErrorCode,
    traceMinAccuracyInput,
    traceTolerancePedestrianInput,
    traceToleranceCarInput,
    setPendingGpsSourceType,
    setTraceMinAccuracyInput,
    setTraceTolerancePedestrianInput,
    setTraceToleranceCarInput,
    applyGpsSource,
    applyTraceSettings,
  };
}
