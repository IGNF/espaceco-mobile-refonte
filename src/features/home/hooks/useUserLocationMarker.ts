import { useEffect } from 'react';

import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorLayer from 'ol/layer/Vector';
import type Map from 'ol/Map';
import { fromLonLat } from 'ol/proj';
import VectorSource from 'ol/source/Vector';
import { Icon, Style } from 'ol/style';

import { EspaceCo_Geolocation, type CallbackID, type WatchPositionCallback } from '@/platform/device/geolocation';
import { EspaceCo_DeviceOrientation } from '@/platform/device/orientation';
import {
  USER_LOCATION_LAYER_NAME,
  USER_LOCATION_MARKER_Z_INDEX,
} from '@/shared/constants/map';
import { getColorCode } from '@/shared/utils/color';
import { degreesToRadians } from '@/shared/utils/number';

function createUserLocationIconSrc(color: string): string {
  // The nose is drawn at the top, so heading 0 points north before OpenLayers rotation.
  const markerSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 42 42">
      <path d="M21 3 L34 35 L21 28 L8 35 Z" fill="${color}" stroke="#ffffff" stroke-width="3" stroke-linejoin="round"/>
      <path d="M21 9 L25.5 28 L21 25 L16.5 28 Z" fill="#ffffff" fill-opacity="0.32"/>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(markerSvg)}`;
}

function createUserLocationStyle(heading: number, color: string): Style {
  return new Style({
    image: new Icon({
      src: createUserLocationIconSrc(color),
      anchor: [0.5, 0.5],
      rotation: degreesToRadians(heading),
      rotateWithView: true,
    }),
  });
}

interface UseUserLocationMarkerOptions {
  map: Map | null;
  isMapReady: boolean;
}

export function useUserLocationMarker({ map, isMapReady }: UseUserLocationMarkerOptions): void {
  useEffect(() => {
    if (!map || !isMapReady) {
      return;
    }

    const userLocationColor = getColorCode('tertiary');
    const source = new VectorSource<Feature<Point>>();
    const feature = new Feature<Point>();
    let heading = 0;
    let watchId: CallbackID | null = null;
    let cancelled = false;

    const markerLayer = new VectorLayer({
      source,
      properties: {
        name: USER_LOCATION_LAYER_NAME,
        title: 'Position utilisateur',
        displayInLayerSwitcher: false,
      },
      zIndex: USER_LOCATION_MARKER_Z_INDEX,
    });

    const updateMarkerStyle = () => {
      feature.setStyle(createUserLocationStyle(heading, userLocationColor));
    };

    const updateMarkerPosition: WatchPositionCallback = (position) => {
      if (!position) {
        return;
      }

      const { longitude, latitude } = position.coords;
      feature.setGeometry(new Point(fromLonLat([longitude, latitude])));
    };

    map.addLayer(markerLayer);
    updateMarkerStyle();
    source.addFeature(feature);

    const stopWatchingDeviceHeading = EspaceCo_DeviceOrientation.watchDeviceHeading((deviceHeading) => {
      heading = deviceHeading.heading;
      updateMarkerStyle();
    });

    void (async () => {
      watchId = await EspaceCo_Geolocation.watchUsersLocation(updateMarkerPosition, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000,
        minimumUpdateInterval: 1000,
      });

      if (cancelled && watchId) {
        void EspaceCo_Geolocation.clearWatch(watchId);
      }
    })();

    return () => {
      cancelled = true;
      stopWatchingDeviceHeading();

      if (watchId) {
        void EspaceCo_Geolocation.clearWatch(watchId);
      }

      map.removeLayer(markerLayer);
    };
  }, [isMapReady, map]);
}
