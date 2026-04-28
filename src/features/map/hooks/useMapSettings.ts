import { MapSettingsContext, type MapSettingsContextType } from "@/app/providers/MapSettingsContext";
import { useContext } from "react";

export function useMapSettings(): MapSettingsContextType {
  const context = useContext(MapSettingsContext);
  if (!context) {
    throw new Error('useMapSettings must be used within a MapSettingsProvider');
  }
  return context;
}