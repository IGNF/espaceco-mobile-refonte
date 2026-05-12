import { useEffect } from 'react';
import type OlMap from 'ol/Map';
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

    const longTouch = new LongTouch({
      delay: LONG_PRESS_DURATION_MS,
      pixelTolerance: LONG_PRESS_MOVE_TOLERANCE_PX,
      handleLongTouchEvent: (event) => {
        const [longitude, latitude] = toLonLat(event.coordinate);
        onLongPress({ latitude, longitude });
      },
    });

    map.addInteraction(longTouch);

    return () => {
      map.removeInteraction(longTouch);
    };
  }, [enabled, map, onLongPress]);
}
