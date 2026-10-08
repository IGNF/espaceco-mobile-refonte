import { useEffect, useRef } from 'react';

import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorLayer from 'ol/layer/Vector';
import type Map from 'ol/Map';
import { fromLonLat } from 'ol/proj';
import VectorSource from 'ol/source/Vector';
import { Circle as CircleStyle, Fill, Icon, Stroke, Style } from 'ol/style';

import { EspaceCo_Geolocation, type CallbackID, type Position, type WatchPositionCallback } from '@/platform/device/geolocation';
import {
  GEOLOCATION_WATCH_TIMEOUT_MS,
  USER_LOCATION_LAYER_NAME,
  USER_LOCATION_MARKER_Z_INDEX,
} from '@/shared/constants/map';
import { getColorCode } from '@/shared/utils/color';
import { degreesToRadians } from '@/shared/utils/number';

/**
 * Below this speed the GPS course is too noisy to orient the marker.
 * A slow walk is still above this threshold.
 */
const MIN_MOVEMENT_SPEED_MPS = 0.3;

function createUserLocationIconSrc(color: string): string {
  // The nose is drawn at the top, so a course of 0 points north on an unrotated map.
  const markerSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 42 42">
      <path d="M21 3 L34 35 L21 28 L8 35 Z" fill="${color}" stroke="#ffffff" stroke-width="3" stroke-linejoin="round"/>
      <path d="M21 9 L25.5 28 L21 25 L16.5 28 Z" fill="#ffffff" fill-opacity="0.32"/>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(markerSvg)}`;
}

function createUserLocationPointStyle(color: string): Style {
  return new Style({
    image: new CircleStyle({
      radius: 8,
      fill: new Fill({ color }),
      stroke: new Stroke({ color: '#ffffff', width: 3 }),
    }),
  });
}

function createUserLocationArrowStyle(course: number, iconSrc: string): Style {
  return new Style({
    image: new Icon({
      src: iconSrc,
      anchor: [0.5, 0.5],
      rotation: degreesToRadians(course),
      rotateWithView: true,
    }),
  });
}

function readCourse(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return null;
  }

  return ((value % 360) + 360) % 360;
}

/**
 * Direction of travel from the GPS fix.
 * Capacitor exposes that bearing as course and puts the compass in heading.
 * A raw navigator fix has no course: its heading is already the direction of travel.
 */
function getMovementCourse(position: Position): number | null {
  const speed = position.coords.speed;
  if (typeof speed === 'number' && Number.isFinite(speed) && speed < MIN_MOVEMENT_SPEED_MPS) {
    return null;
  }

  if (position.coords.course !== undefined) {
    return readCourse(position.coords.course);
  }

  return readCourse(position.coords.heading);
}

interface UseUserLocationMarkerOptions {
  map: Map | null;
  isMapReady: boolean;
  /**
   * Survey (levé / suivi GNSS) and trace sessions show a movement arrow.
   * Everywhere else the marker stays a point.
   */
  showMovementDirection: boolean;
}

export function useUserLocationMarker({
  map,
  isMapReady,
  showMovementDirection,
}: UseUserLocationMarkerOptions): void {
  const showMovementDirectionRef = useRef(showMovementDirection);
  const updateMarkerStyleRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!map || !isMapReady) {
      return;
    }

    const arrowIconSrc = createUserLocationIconSrc(getColorCode('tertiary'));
    const pointStyle = createUserLocationPointStyle(getColorCode('primary'));
    const source = new VectorSource<Feature<Point>>();
    const feature = new Feature<Point>();
    let course: number | null = null;
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
      if (showMovementDirectionRef.current && course !== null) {
        feature.setStyle(createUserLocationArrowStyle(course, arrowIconSrc));
        return;
      }

      feature.setStyle(pointStyle);
    };

    updateMarkerStyleRef.current = updateMarkerStyle;

    const updateMarkerPosition: WatchPositionCallback = (position) => {
      if (!position) {
        return;
      }

      const { longitude, latitude } = position.coords;
      feature.setGeometry(new Point(fromLonLat([longitude, latitude])));

      if (showMovementDirectionRef.current) {
        const nextCourse = getMovementCourse(position);
        if (nextCourse !== null) {
          course = nextCourse;
        }
      }

      updateMarkerStyle();
    };

    map.addLayer(markerLayer);
    updateMarkerStyle();
    source.addFeature(feature);

    void (async () => {
      watchId = await EspaceCo_Geolocation.watchUsersLocation(updateMarkerPosition, {
        enableHighAccuracy: true,
        timeout: GEOLOCATION_WATCH_TIMEOUT_MS,
        maximumAge: 1000,
        minimumUpdateInterval: 1000,
      });

      if (cancelled && watchId) {
        void EspaceCo_Geolocation.clearWatch(watchId);
      }
    })();

    return () => {
      cancelled = true;
      updateMarkerStyleRef.current = () => {};

      if (watchId) {
        void EspaceCo_Geolocation.clearWatch(watchId);
      }

      map.removeLayer(markerLayer);
    };
  }, [isMapReady, map]);

  useEffect(() => {
    showMovementDirectionRef.current = showMovementDirection;
    updateMarkerStyleRef.current();
  }, [showMovementDirection]);
}
