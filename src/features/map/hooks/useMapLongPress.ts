import { useEffect } from 'react';
import type OlMap from 'ol/Map';
import type { ListenerFunction } from 'ol/events';
import { toLonLat } from 'ol/proj';
import LongTouch from 'ol-ext/interaction/LongTouch';

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

    let hasLongPressed = false;

    const longTouch = new LongTouch({
      delay: LONG_PRESS_DURATION_MS,
      pixelTolerance: LONG_PRESS_MOVE_TOLERANCE_PX,
      handleLongTouchEvent: (event) => {
        hasLongPressed = true;
        const [longitude, latitude] = toLonLat(event.coordinate);
        console.log('longTouch', longitude, latitude);
        onLongPress({ latitude, longitude });
      },
    });

    // When the pointer is released after a long press without having moved, OpenLayers still emits
    // a click, which would also open the objects under the pointer. Preventing the pointerup cancels that click.
    const handlePointerUp: ListenerFunction = (event) => {
      if (hasLongPressed) {
        event.preventDefault();
        hasLongPressed = false;
      }
    };

    map.addInteraction(longTouch);
    map.addEventListener('pointerup', handlePointerUp);

    return () => {
      map.removeInteraction(longTouch);
      map.removeEventListener('pointerup', handlePointerUp);
    };
  }, [enabled, map, onLongPress]);
}
