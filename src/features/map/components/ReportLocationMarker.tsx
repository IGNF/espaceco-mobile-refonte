import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Overlay from 'ol/Overlay';
import type OlMap from 'ol/Map';
import { fromLonLat } from 'ol/proj';
import type { Position } from '@/platform/device/geolocation';
import { MapLocationPointer } from '@/features/map/components/MapLocationPointer';

interface ReportLocationMarkerProps {
  map: OlMap;
  position: Position;
}

/**
 * Pins the report location on the map with the same symbol used while aiming.
 * The crosshair places the symbol's top-left on the map center, so the overlay
 * uses that same anchor and the symbol does not jump after validation.
 */
export function ReportLocationMarker({ map, position }: ReportLocationMarkerProps) {
  const [element] = useState(() => {
    const markerElement = document.createElement('div');
    markerElement.style.pointerEvents = 'none';
    return markerElement;
  });

  const longitude = position.coords.longitude;
  const latitude = position.coords.latitude;

  useLayoutEffect(() => {
    const overlay = new Overlay({
      element,
      positioning: 'top-left',
      stopEvent: false,
    });
    map.addOverlay(overlay);
    overlay.setPosition(fromLonLat([longitude, latitude]));

    return () => {
      map.removeOverlay(overlay);
    };
  }, [element, latitude, longitude, map]);

  return createPortal(<MapLocationPointer variant="marker" />, element);
}
