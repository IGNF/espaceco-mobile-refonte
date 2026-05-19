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
  traceToleranceInput: string;
  setPendingGpsSourceType: (source: GpsSourceType) => void;
  setTraceMinAccuracyInput: (value: string) => void;
  setTraceToleranceInput: (value: string) => void;
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
  const [traceToleranceInput, setTraceToleranceInput] = useState(String(traceRecordingSettings.tolerance));

  const setTraceInputValues = (settings: TraceRecordingSettings): void => {
    setTraceMinAccuracyInput(String(settings.minAccuracy));
    setTraceToleranceInput(String(settings.tolerance));
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
      const tolerance = parseDecimalInput(traceToleranceInput);
      const parsedSettings: TraceRecordingSettings = {
        minAccuracy,
        tolerance,
      };

      const allValuesAreValid = [
        parsedSettings.minAccuracy,
        parsedSettings.tolerance,
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
    traceToleranceInput,
    setPendingGpsSourceType,
    setTraceMinAccuracyInput,
    setTraceToleranceInput,
    applyGpsSource,
    applyTraceSettings,
  };
}
