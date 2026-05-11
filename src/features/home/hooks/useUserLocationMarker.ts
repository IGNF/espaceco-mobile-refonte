import { useEffect } from 'react';

import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorLayer from 'ol/layer/Vector';
import type Map from 'ol/Map';
import { fromLonLat } from 'ol/proj';
import VectorSource from 'ol/source/Vector';
import { Fill, RegularShape, Stroke, Style } from 'ol/style';

import { EspaceCo_Geolocation, type CallbackID, type WatchPositionCallback } from '@/platform/device/geolocation';
import { EspaceCo_DeviceOrientation } from '@/platform/device/orientation';
import {
  USER_LOCATION_LAYER_NAME,
  USER_LOCATION_MARKER_RADIUS,
  USER_LOCATION_MARKER_STROKE_WIDTH,
  USER_LOCATION_MARKER_Z_INDEX,
} from '@/shared/constants/map';
import { getColorCode } from '@/shared/utils/color';
import { degreesToRadians } from '@/shared/utils/number';

function createUserLocationStyle(heading: number, color: string): Style {
  return new Style({
    image: new RegularShape({
      points: 3,
      radius: USER_LOCATION_MARKER_RADIUS,
      angle: 0,
      rotation: degreesToRadians(heading),
      rotateWithView: true,
      fill: new Fill({ color }),
      stroke: new Stroke({
        color: '#ffffff',
        width: USER_LOCATION_MARKER_STROKE_WIDTH,
      }),
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
