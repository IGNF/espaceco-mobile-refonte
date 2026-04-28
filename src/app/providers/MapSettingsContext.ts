import { createContext } from "react";
import type { MapSettings } from "@/domain/map/models";

export interface MapSettingsContextType {
  mapSettings: MapSettings;
  setMapSettings: (mapSettings: MapSettings) => Promise<void>;
}

export const MapSettingsContext = createContext<MapSettingsContextType | null>(null);