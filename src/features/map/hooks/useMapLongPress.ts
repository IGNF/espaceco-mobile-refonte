import { useEffect } from 'react';
import type OlMap from 'ol/Map';
import { toLonLat } from 'ol/proj';

export interface MapLongPressCoordinate {
  latitude: number;
  longitude: number;
}

interface UseMapLongPressOptions {
  map?: OlMap | null;
  enabled: boolean;
  onLongPress: (coordinate: MapLongPressCoordinate) => void;
}

const LONG_PRESS_DURATION_MS = 500;
const LONG_PRESS_MOVE_TOLERANCE_PX = 8;

export function useMapLongPress({
  map,
  enabled,
  onLongPress,
}: UseMapLongPressOptions) {
  useEffect(() => {
    if (!map || !enabled) return;

    const viewport = map.getViewport();
    let timeoutId: number | null = null;
    let startClientX = 0;
    let startClientY = 0;
    let activePointerId: number | null = null;
    let hasLongPressed = false;

    const clearLongPress = (resetLongPressState = true) => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
      activePointerId = null;
      if (resetLongPressState) {
        hasLongPressed = false;
      }
    };

    const triggerLongPress = (clientX: number, clientY: number) => {
      if (hasLongPressed) return;

      const viewportRect = viewport.getBoundingClientRect();
      const pixel = [
        clientX - viewportRect.left,
        clientY - viewportRect.top,
      ];
      const [longitude, latitude] = toLonLat(map.getCoordinateFromPixel(pixel));

      hasLongPressed = true;
      clearLongPress(false);
      onLongPress({ latitude, longitude });
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || !viewport.contains(event.target as Node)) return;

      startClientX = event.clientX;
      startClientY = event.clientY;
      activePointerId = event.pointerId;
      hasLongPressed = false;
      timeoutId = window.setTimeout(() => {
        triggerLongPress(startClientX, startClientY);
      }, LONG_PRESS_DURATION_MS);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (activePointerId !== event.pointerId || hasLongPressed) return;

      const deltaX = event.clientX - startClientX;
      const deltaY = event.clientY - startClientY;
      if (Math.hypot(deltaX, deltaY) > LONG_PRESS_MOVE_TOLERANCE_PX) {
        clearLongPress();
      }
    };

    const handlePointerEnd = (event: PointerEvent) => {
      if (activePointerId === event.pointerId && hasLongPressed) {
        event.preventDefault();
        event.stopPropagation();
      }
      clearLongPress();
    };

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      if (activePointerId === null && !hasLongPressed) return;
      triggerLongPress(event.clientX || startClientX, event.clientY || startClientY);
    };

    viewport.addEventListener('pointerdown', handlePointerDown, true);
    viewport.addEventListener('pointermove', handlePointerMove, true);
    viewport.addEventListener('pointerup', handlePointerEnd, true);
    viewport.addEventListener('pointercancel', handlePointerEnd, true);
    viewport.addEventListener('contextmenu', handleContextMenu);

    return () => {
      clearLongPress();
      viewport.removeEventListener('pointerdown', handlePointerDown, true);
      viewport.removeEventListener('pointermove', handlePointerMove, true);
      viewport.removeEventListener('pointerup', handlePointerEnd, true);
      viewport.removeEventListener('pointercancel', handlePointerEnd, true);
      viewport.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [enabled, map, onLongPress]);
}
