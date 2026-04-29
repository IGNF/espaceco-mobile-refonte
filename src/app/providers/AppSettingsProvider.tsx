import type { MapSettings } from "@/domain/map/models";
import { useState, useCallback, useEffect, type ReactNode } from "react";
import { AppSettingsContext } from "./AppSettingsContext";

import { useAuth } from "@/features/auth/hooks/useAuth";

import { EspaceCo_SettingsStore } from '@/infra/persistence/settingsStore';
import type { DisplayMode } from "@/domain/user/models";
import { DEFAULT_TRACE_RECORDING_SETTINGS, type TraceRecordingSettings } from "@/features/report/constants/reportTrace.constants";

interface AppSettingsProviderProps {
  children: ReactNode;
}

const DEFAULT_MAP_SETTINGS: MapSettings = {
  isZoomEnabled: true,
  isRotationEnabled: true,
  isSearchEnabled: true,
};

const DEFAULT_DISPLAY_MODE: DisplayMode = 'beginner';


export function AppSettingsProvider({ children }: AppSettingsProviderProps) {
  const [mapSettings, setMapSettingsValue] = useState<MapSettings>({
    ...DEFAULT_MAP_SETTINGS,
  });
  const [displayMode, setDisplayModeValue] = useState<DisplayMode>(DEFAULT_DISPLAY_MODE);
  const [traceRecordingSettings, setTraceRecordingSettingsValue] = useState<TraceRecordingSettings>(DEFAULT_TRACE_RECORDING_SETTINGS);


  const { user } = useAuth();
  const userId = user?.id ?? null;

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      const storedTraceRecordingSettings = await EspaceCo_SettingsStore.getTraceRecordingSettings();
      const storedMapSettings = userId === null
        ? DEFAULT_MAP_SETTINGS
        : await EspaceCo_SettingsStore.getMapSettings(userId);
      const storedDisplayMode = userId === null
        ? DEFAULT_DISPLAY_MODE
        : await EspaceCo_SettingsStore.getDisplayMode(userId);

      if (!isMounted) return;

      setMapSettingsValue(storedMapSettings);
      setDisplayModeValue(storedDisplayMode);
      setTraceRecordingSettingsValue(storedTraceRecordingSettings);
    })();

    return () => {
      isMounted = false;
    };
  }, [userId]);


  /**
   * Map Settings
   */

  const setMapSettings = useCallback(async (settings: MapSettings) => {
    if (userId === null) return;

    const savedSettings = await EspaceCo_SettingsStore.saveMapSettings(userId, settings);
    setMapSettingsValue(savedSettings);
  }, [userId]);

  /**
   * Display Mode Settings
   */

  const setDisplayMode = useCallback(async (mode: DisplayMode) => {
    if (!user) return;
    await EspaceCo_SettingsStore.saveDisplayMode(user.id, mode);
    setDisplayModeValue(mode);
  }, [user]);

  /**
   * Trace Recording Settings
   */

  const setTraceRecordingSettings = useCallback(async (settings: TraceRecordingSettings) => {
    const savedSettings = await EspaceCo_SettingsStore.saveTraceRecordingSettings(settings);
    setTraceRecordingSettingsValue(savedSettings);
  }, []);

  return (
    <AppSettingsContext.Provider value={{ mapSettings, setMapSettings, displayMode, setDisplayMode, traceRecordingSettings, setTraceRecordingSettings }}>
      {children}
    </AppSettingsContext.Provider>
  );
}
