import { createContext } from "react";
import type { MapSettings } from "@/domain/map/models";
import type { DisplayMode } from "@/domain/user/models";
import type { TraceRecordingSettings } from "@/features/report/constants/reportTrace.constants";

export interface AppSettingsContextType {
  mapSettings: MapSettings;
  setMapSettings: (mapSettings: MapSettings) => Promise<void>;
  displayMode: DisplayMode;
  setDisplayMode: (displayMode: DisplayMode) => Promise<void>;
  traceRecordingSettings: TraceRecordingSettings;
  setTraceRecordingSettings: (traceRecordingSettings: TraceRecordingSettings) => Promise<void>;
}

export const AppSettingsContext = createContext<AppSettingsContextType | null>(null);