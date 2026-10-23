import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  MapPanelContext,
  useIsWideLayout,
  type MapPanelSheetSize,
} from '@/shared/layout/useMapPanel';

interface MapPanelRegistration {
  id: number;
  size: MapPanelSheetSize;
}

export function MapPanelProvider({ children }: { children: ReactNode }) {
  const isWideLayout = useIsWideLayout();
  const [panels, setPanels] = useState<MapPanelRegistration[]>([]);
  const nextIdRef = useRef(1);

  const registerSheet = useCallback((size: MapPanelSheetSize) => {
    const id = nextIdRef.current;
    nextIdRef.current += 1;
    setPanels((current) => [...current, { id, size }]);
    return () => {
      setPanels((current) => current.filter((panel) => panel.id !== id));
    };
  }, []);

  const sheetSize = panels.some((panel) => panel.size === 'tall')
    ? 'tall'
    : panels.length > 0
      ? 'half'
      : null;

  const insetRight = isWideLayout && sheetSize ? 'var(--map-panel-width)' : '0px';
  const insetBottom = !isWideLayout && sheetSize
    ? `max(0px, calc(var(--map-panel-height-${sheetSize}) - var(--app-tabbar-height, 0px)))`
    : '0px';

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--map-inset-right', insetRight);
    root.style.setProperty('--map-inset-bottom', insetBottom);
  }, [insetBottom, insetRight]);

  const value = useMemo(() => ({
    isWideLayout,
    hasMapPanel: sheetSize !== null,
    insetRight,
    insetBottom,
    registerSheet,
  }), [insetBottom, insetRight, isWideLayout, registerSheet, sheetSize]);

  return (
    <MapPanelContext.Provider value={value}>
      {children}
    </MapPanelContext.Provider>
  );
}
