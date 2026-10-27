import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  MapPanelContext,
  useIsWideLayout,
  type MapPanelRegistrationHandle,
} from '@/shared/layout/useMapPanel';

interface MapPanelRegistration {
  id: number;
  heightPercent: number;
}

export function MapPanelProvider({ children }: { children: ReactNode }) {
  const isWideLayout = useIsWideLayout();
  const [panels, setPanels] = useState<MapPanelRegistration[]>([]);
  const nextIdRef = useRef(1);

  const registerSheet = useCallback((heightPercent: number): MapPanelRegistrationHandle => {
    const id = nextIdRef.current;
    nextIdRef.current += 1;
    setPanels((current) => [...current, { id, heightPercent }]);
    return {
      update(nextHeightPercent: number) {
        setPanels((current) => current.map((panel) => (
          panel.id === id ? { ...panel, heightPercent: nextHeightPercent } : panel
        )));
      },
      unregister() {
        setPanels((current) => current.filter((panel) => panel.id !== id));
      },
    };
  }, []);

  const hasSheet = panels.length > 0;
  const sheetHeightPercent = panels.reduce(
    (tallest, panel) => Math.max(tallest, panel.heightPercent),
    0,
  );

  const insetRight = isWideLayout && hasSheet ? 'var(--map-panel-width)' : '0px';
  const insetBottom = !isWideLayout && hasSheet
    ? `max(0px, calc(${sheetHeightPercent}vh - var(--app-tabbar-height, 0px)))`
    : '0px';

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--map-inset-right', insetRight);
    root.style.setProperty('--map-inset-bottom', insetBottom);
  }, [insetBottom, insetRight]);

  const value = useMemo(() => ({
    isWideLayout,
    hasMapPanel: hasSheet,
    insetRight,
    insetBottom,
    registerSheet,
  }), [hasSheet, insetBottom, insetRight, isWideLayout, registerSheet]);

  return (
    <MapPanelContext.Provider value={value}>
      {children}
    </MapPanelContext.Provider>
  );
}
