import type { MapSettings } from "@/domain/map/models";
import { useState, useCallback, useEffect, type ReactNode } from "react";
import { MapSettingsContext } from "./MapSettingsContext";

import { EspaceCo_SettingsStore } from '@/infra/persistence/settingsStore';

interface MapSettingsProviderProps {
  children: ReactNode;
}

const DEFAULT_MAP_SETTINGS: MapSettings = {
  isZoomEnabled: true,
  isRotationEnabled: true,
  isSearchEnabled: true,
};

export function MapSettingsProvider({ children }: MapSettingsProviderProps) {
  const [mapSettings, setMapSettingsValue] = useState<MapSettings>({
    ...DEFAULT_MAP_SETTINGS,
  });

  useEffect(() => {
    void EspaceCo_SettingsStore.getMapSettings().then((settings) => {
      setMapSettingsValue(settings);
    });
  }, []);

  const setMapSettings = useCallback(async (settings: MapSettings) => {
    await EspaceCo_SettingsStore.saveMapSettings(settings);
    setMapSettingsValue(settings);
  }, []);

  return (
    <MapSettingsContext.Provider value={{ mapSettings, setMapSettings }}>
      {children}
    </MapSettingsContext.Provider>
  );
}