import { createContext, useContext, useEffect, useState } from 'react';

const WIDE_LAYOUT_MEDIA_QUERY = '(min-width: 1024px)';

export type MapPanelSheetSize = 'half' | 'tall';

export interface MapPanelContextValue {
  isWideLayout: boolean;
  hasMapPanel: boolean;
  insetRight: string;
  insetBottom: string;
  registerSheet: (size: MapPanelSheetSize) => () => void;
}

function unregisterNothing() {}

export const MapPanelContext = createContext<MapPanelContextValue>({
  isWideLayout: false,
  hasMapPanel: false,
  insetRight: '0px',
  insetBottom: '0px',
  registerSheet: () => unregisterNothing,
});

export function useIsWideLayout(): boolean {
  const [isWideLayout, setIsWideLayout] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia(WIDE_LAYOUT_MEDIA_QUERY).matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(WIDE_LAYOUT_MEDIA_QUERY);
    const handleChange = () => setIsWideLayout(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isWideLayout;
}

export function useMapPanel(): MapPanelContextValue {
  return useContext(MapPanelContext);
}
