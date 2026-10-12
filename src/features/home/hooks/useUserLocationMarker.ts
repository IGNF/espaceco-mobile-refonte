import { useEffect, useRef } from 'react';

import Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import Point from 'ol/geom/Point';
import Polygon, { circular } from 'ol/geom/Polygon';
import VectorLayer from 'ol/layer/Vector';
import type Map from 'ol/Map';
import Overlay from 'ol/Overlay';
import { fromLonLat } from 'ol/proj';
import VectorSource from 'ol/source/Vector';
import { Fill, Icon, Style } from 'ol/style';

import { EspaceCo_Geolocation, type CallbackID, type Position, type WatchPositionCallback } from '@/platform/device/geolocation';
import {
  GEOLOCATION_WATCH_TIMEOUT_MS,
  USER_LOCATION_LAYER_NAME,
  USER_LOCATION_MARKER_Z_INDEX,
} from '@/shared/constants/map';
import { getColorCode } from '@/shared/utils/color';
import { degreesToRadians } from '@/shared/utils/number';

import styles from './useUserLocationMarker.module.css';

/**
 * Below this speed the GPS course is too noisy to orient the marker.
 * A slow walk is still above this threshold.
 */
const MIN_MOVEMENT_SPEED_MPS = 0.3;

/** PDOP bands from the ticket: green below 2, orange up to 4, red above. */
const PDOP_GOOD_MAX = 2;
const PDOP_MEDIUM_MAX = 4;

/** Same fills as ol-ext GeolocationDraw: green, orange, then red. */
const ACCURACY_FILL = {
  good: 'rgba(0, 255, 0, 0.2)',
  medium: 'rgba(255, 192, 0, 0.2)',
  poor: 'rgba(255, 0, 0, 0.2)',
};

interface PositionWithNmea extends Position {
  nmea?: {
    pdop?: number;
  };
}

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

function readPdop(position: Position): number | null {
  const pdop = (position as PositionWithNmea).nmea?.pdop;
  if (typeof pdop !== 'number' || !Number.isFinite(pdop) || pdop <= 0) {
    return null;
  }

  return pdop;
}

/**
 * NMEA PDOP colors the circle when the fix carries it.
 * Otherwise the color follows the GPS accuracy setting, as in the previous app:
 * green under half the threshold, orange under the threshold, red above.
 */
function accuracyFill(accuracy: number, pdop: number | null, minAccuracy: number): string {
  if (pdop !== null) {
    if (pdop < PDOP_GOOD_MAX) return ACCURACY_FILL.good;
    if (pdop <= PDOP_MEDIUM_MAX) return ACCURACY_FILL.medium;
    return ACCURACY_FILL.poor;
  }

  if (accuracy < minAccuracy / 2) return ACCURACY_FILL.good;
  if (accuracy < minAccuracy) return ACCURACY_FILL.medium;
  return ACCURACY_FILL.poor;
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

function createLocationDot(): HTMLDivElement {
  const marker = document.createElement('div');
  marker.className = styles.marker;

  const ring = document.createElement('span');
  ring.className = styles.ring;
  const delayedRing = document.createElement('span');
  delayedRing.className = `${styles.ring} ${styles.ringDelayed}`;
  const dot = document.createElement('span');
  dot.className = styles.dot;

  marker.append(ring, delayedRing, dot);
  return marker;
}

interface UseUserLocationMarkerOptions {
  map: Map | null;
  isMapReady: boolean;
  /**
   * Survey (levé / suivi GNSS) and trace sessions show a movement arrow
   * and the accuracy circle.
   */
  showMovementDirection: boolean;
  /** GPS accuracy setting, in meters. Same value as the trace recording setting. */
  minAccuracy: number;
}

export function useUserLocationMarker({
  map,
  isMapReady,
  showMovementDirection,
  minAccuracy,
}: UseUserLocationMarkerOptions): void {
  const showMovementDirectionRef = useRef(showMovementDirection);
  const minAccuracyRef = useRef(minAccuracy);
  const updateMarkerStyleRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!map || !isMapReady) {
      return;
    }

    const arrowIconSrc = createUserLocationIconSrc(getColorCode('tertiary'));
    const hiddenStyle = new Style();
    const source = new VectorSource<Feature<Geometry>>();
    const positionFeature = new Feature<Point>();
    const accuracyFeature = new Feature<Polygon>();
    const dot = createLocationDot();
    const dotOverlay = new Overlay({
      element: dot,
      positioning: 'center-center',
      stopEvent: false,
    });
    let course: number | null = null;
    let accuracy: number | null = null;
    let pdop: number | null = null;
    let longitude = 0;
    let latitude = 0;
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
      const arrowCourse = showMovementDirectionRef.current ? course : null;
      dot.classList.toggle(styles.withoutDot, arrowCourse !== null);

      if (showMovementDirectionRef.current && accuracy !== null) {
        const geometry = circular([longitude, latitude], accuracy);
        geometry.transform('EPSG:4326', map.getView().getProjection());
        accuracyFeature.setGeometry(geometry);
        accuracyFeature.setStyle(new Style({
          fill: new Fill({ color: accuracyFill(accuracy, pdop, minAccuracyRef.current) }),
        }));
      } else {
        accuracyFeature.setGeometry(undefined);
      }

      positionFeature.setStyle(
        arrowCourse !== null
          ? createUserLocationArrowStyle(arrowCourse, arrowIconSrc)
          : hiddenStyle,
      );
    };

    updateMarkerStyleRef.current = updateMarkerStyle;

    const updateMarkerPosition: WatchPositionCallback = (position) => {
      if (!position) {
        return;
      }

      longitude = position.coords.longitude;
      latitude = position.coords.latitude;
      const coordinate = fromLonLat([longitude, latitude]);
      positionFeature.setGeometry(new Point(coordinate));
      dotOverlay.setPosition(coordinate);
      const nextAccuracy = position.coords.accuracy;
      accuracy = Number.isFinite(nextAccuracy) && nextAccuracy > 0 ? nextAccuracy : null;
      pdop = readPdop(position);

      if (showMovementDirectionRef.current) {
        const nextCourse = getMovementCourse(position);
        if (nextCourse !== null) {
          course = nextCourse;
        }
      }

      updateMarkerStyle();
    };

    map.addLayer(markerLayer);
    map.addOverlay(dotOverlay);
    updateMarkerStyle();
    source.addFeature(accuracyFeature);
    source.addFeature(positionFeature);

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

      map.removeOverlay(dotOverlay);
      map.removeLayer(markerLayer);
    };
  }, [isMapReady, map]);

  useEffect(() => {
    showMovementDirectionRef.current = showMovementDirection;
    minAccuracyRef.current = minAccuracy;
    updateMarkerStyleRef.current();
  }, [minAccuracy, showMovementDirection]);
}
