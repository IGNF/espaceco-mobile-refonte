import { useEffect, useRef, useCallback, useState, type Dispatch, type SetStateAction } from "react";
import Map from "ol/Map";
import View from "ol/View";
import { Attribution, defaults as defaultControls } from "ol/control";
import ScaleLine from "ol/control/ScaleLine";
import DragRotate from "ol/interaction/DragRotate";
import PinchRotate from "ol/interaction/PinchRotate";
import { defaults as defaultInteractions } from "ol/interaction";
import LayerGroup from "ol/layer/Group";
import { fromLonLat } from "ol/proj";
import { containsCoordinate } from "ol/extent";
import { unByKey } from "ol/Observable";
import "ol/ol.css";
import { EspaceCo_Geolocation, type CallbackID, type Position } from "@/platform/device/geolocation";
import {
  DEFAULT_MAP_CENTER_LON_LAT,
  DEFAULT_MAP_FOCUS_ZOOM,
  DEFAULT_MAP_FOCUS_ZOOM_ON_USER_LOCATION,
  DEFAULT_MAP_SHOW_SCALELINE,
  DEFAULT_MAP_ZOOM,
  GEOLOCATION_LOCK_RECENTER_ANIMATION_DURATION_MS,
  GEOLOCATION_LOCK_RECENTER_INTERVAL_MS,
  GEOLOCATION_RECENTER_AFTER_MOVEMENT_MS,
  GEOLOCATION_TRACKING_RECENTER_INTERVAL_MS,
} from "@/shared/constants/map";
import {
  initGeoportailCapabilities,
  createGeoportailLayerGroup,
} from "@/infra/map/openlayers/geoportailLayers";

interface UseMapOptions {
  centerOnUserLocation?: boolean;
  skipGeoportailCapabilities?: boolean;
  isRotationEnabled?: boolean;
}

/**
 * Le mode tracking est activé lorsque l'utilisateur appuie sur le bouton de suivi GPS.
 * => on recentre automatiquement sur la position de l'utilisateur à intervalles réguliers (voir constante GEOLOCATION_TRACKING_RECENTER_INTERVAL_MS)
 * Le mode locked est activé lorsque l'utilisateur double-tap sur le bouton de centrage
 * => on recentre automatiquement sur la position de l'utilisateur à intervalles réguliers (voir constante GEOLOCATION_LOCK_RECENTER_INTERVAL_MS)
 */
export type UserFollowingMode = 'none' | 'tracking' | 'locked';

/**
 * Location status relative to the current viewport while auto-recenter is active.
 * - inside: keep the user's manual center/zoom.
 * - border: slide back to the user position without changing zoom.
 * - outside: slide back to the user position and restore the default user zoom.
 */
type UserLocationViewportStatus = 'inside' | 'border' | 'outside';

/**
 * The user is considered near the viewport border when their location is within
 * this many pixels of an edge. At that point we recenter but preserve zoom.
 */
const USER_LOCATION_BORDER_PADDING_PX = 48;
const USER_LOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
};

interface UseMapReturn {
  mapElementRef: React.RefObject<HTMLDivElement | null>;
  mapRef: React.RefObject<Map | null>;
  map: Map | null;
  centerOnUserLocation: (animationDuration?: number) => Promise<void>;
  lockUserLocationOnMap: () => void;
  userFollowingMode: UserFollowingMode;
  setUserFollowingMode: Dispatch<SetStateAction<UserFollowingMode>>;
  setIsGeolocationRecenterActive: Dispatch<SetStateAction<boolean>>;
  /**
   * Must be called by UI controls that change the map viewport outside
   * OpenLayers pointer/touch events, such as the custom zoom buttons.
   */
  onUserViewportChange: () => void;
  isLocating: boolean;
  isLockedUserLocation: boolean;
  isMapReady: boolean;
  hasInitialCenterCompleted: boolean;
}

export function useMap(options: UseMapOptions = {}): UseMapReturn {
  const {
    centerOnUserLocation: shouldCenterOnMount = true,
    skipGeoportailCapabilities = false,
    isRotationEnabled = false,
  } = options;

  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const isLocatingRef = useRef(false);
  const programmaticViewportChangeCountRef = useRef(0);
  const isUserViewportChangePendingRef = useRef(false);
  const hasManualViewportOverrideRef = useRef(false);
  const userViewportChangeTimeoutRef = useRef<number | null>(null);
  const latestPositionRef = useRef<Position | null>(null);
  const isAutoRecenterActiveRef = useRef(false);
  const skipGeoportailCapabilitiesOnInitRef = useRef(skipGeoportailCapabilities);
  const isRotationEnabledRef = useRef(isRotationEnabled);
  isRotationEnabledRef.current = isRotationEnabled;
  const [map, setMap] = useState<Map | null>(null);
  const [userFollowingMode, setUserFollowingMode] = useState<UserFollowingMode>('none');
  const [isFeatureGeolocationRecenterActive, setIsGeolocationRecenterActive] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [hasInitialCenterCompleted, setHasInitialCenterCompleted] = useState(
    () => !shouldCenterOnMount
  );
  const isLockedUserLocation = userFollowingMode === 'locked';
  const isAutoRecenterActive =
    isFeatureGeolocationRecenterActive ||
    userFollowingMode === 'tracking';

  /**
   * Marks app-driven viewport changes so they do not start the "user moved the
   * map" timeout. Programmatic center/zoom updates can emit the same map events
   * as real user interactions.
   */
  const markProgrammaticViewportChange = useCallback(() => {
    programmaticViewportChangeCountRef.current += 1;

    return () => {
      programmaticViewportChangeCountRef.current = Math.max(
        programmaticViewportChangeCountRef.current - 1,
        0
      );
    };
  }, []);

  const runProgrammaticViewportChange = useCallback((change: () => void) => {
    const endProgrammaticViewportChange = markProgrammaticViewportChange();
    try {
      change();
    } finally {
      window.setTimeout(endProgrammaticViewportChange, 0);
    }
  }, [markProgrammaticViewportChange]);

  const animateTo = useCallback(async (
    map: Map,
    centerLonLat: [number, number],
    zoom: number = DEFAULT_MAP_FOCUS_ZOOM,
    duration: number = 500
  ) => {
    await new Promise<void>((resolve) => {
      const endProgrammaticViewportChange = markProgrammaticViewportChange();
      map.getView().animate(
        {
          center: fromLonLat(centerLonLat),
          zoom: zoom,
          duration,
        },
        () => {
          endProgrammaticViewportChange();
          resolve();
        }
      );
    });
  }, [markProgrammaticViewportChange]);

  const lockUserLocationOnMap = useCallback(() => {
    setUserFollowingMode((mode) => mode === 'locked' ? 'none' : 'locked');
  }, []);

  const animateToPosition = useCallback(async (
    map: Map,
    position: Position,
    animationDuration: number,
  ) => {
    const { longitude, latitude } = position.coords;
    await animateTo(map, [longitude, latitude], DEFAULT_MAP_FOCUS_ZOOM_ON_USER_LOCATION, animationDuration);
  }, [animateTo]);

  const centerViewOnPosition = useCallback((map: Map, position: Position, shouldResetZoom = false) => {
    const { longitude, latitude } = position.coords;
    const view = map.getView();

    runProgrammaticViewportChange(() => {
      view.setCenter(fromLonLat([longitude, latitude]));
      if (shouldResetZoom) {
        view.setZoom(DEFAULT_MAP_FOCUS_ZOOM_ON_USER_LOCATION);
      }
    });
  }, [runProgrammaticViewportChange]);

  /**
   * Smooth recenter used after the user has manually moved or zoomed the map.
   * Regular 1-second GPS follow uses direct updates to stay responsive.
   */
  const animateViewToPosition = useCallback((map: Map, position: Position, shouldResetZoom = false) => {
    const { longitude, latitude } = position.coords;
    const view = map.getView();

    const endProgrammaticViewportChange = markProgrammaticViewportChange();
    view.animate(
      {
        center: fromLonLat([longitude, latitude]),
        ...(shouldResetZoom ? { zoom: DEFAULT_MAP_FOCUS_ZOOM_ON_USER_LOCATION } : {}),
        duration: GEOLOCATION_LOCK_RECENTER_ANIMATION_DURATION_MS,
      },
      () => {
        endProgrammaticViewportChange();
      }
    );
  }, [markProgrammaticViewportChange]);

  /**
   * Determines which delayed reset rule applies after manual map movement:
   * - outside viewport: recenter and reset zoom.
   * - near viewport border: recenter only.
   * - safely inside viewport: do nothing.
   */
  const getPositionViewportStatus = useCallback((map: Map, position: Position): UserLocationViewportStatus => {
    const size = map.getSize();
    if (!size) {
      return 'outside';
    }

    const coordinate = fromLonLat([position.coords.longitude, position.coords.latitude]);
    const extent = map.getView().calculateExtent(size);
    if (!containsCoordinate(extent, coordinate)) {
      return 'outside';
    }

    const [width, height] = size;
    const [x, y] = map.getPixelFromCoordinate(coordinate);
    if (
      x <= USER_LOCATION_BORDER_PADDING_PX ||
      x >= width - USER_LOCATION_BORDER_PADDING_PX ||
      y <= USER_LOCATION_BORDER_PADDING_PX ||
      y >= height - USER_LOCATION_BORDER_PADDING_PX
    ) {
      return 'border';
    }

    return 'inside';
  }, []);

  const getLatestPosition = useCallback(async () => {
    if (latestPositionRef.current) {
      return latestPositionRef.current;
    }

    const position = await EspaceCo_Geolocation.getUsersLocation(USER_LOCATION_OPTIONS);

    latestPositionRef.current = position;
    return position;
  }, []);

  /**
   * Applies the delayed auto-recenter rule after manual pan/zoom.
   * Zoom is reset only when the latest user position is completely outside the map.
   */
  const restoreViewportAfterUserChange = useCallback(async () => {
    userViewportChangeTimeoutRef.current = null;
    isUserViewportChangePendingRef.current = false;

    const map = mapRef.current;
    if (!map || !isAutoRecenterActiveRef.current) {
      return;
    }

    let position: Position | null = null;
    try {
      position = await getLatestPosition();
    } catch (error) {
      console.error("Error restoring map viewport after user movement:", error);
      return;
    }

    if (!position) return;

    const viewportStatus = getPositionViewportStatus(map, position);
    if (viewportStatus === 'outside') {
      hasManualViewportOverrideRef.current = false;
      animateViewToPosition(map, position, true);
      return;
    }

    if (viewportStatus === 'border') {
      animateViewToPosition(map, position, false);
    }
  }, [animateViewToPosition, getLatestPosition, getPositionViewportStatus]);

  /**
   * Starts or refreshes the 10-second grace period after a manual pan/zoom.
   * During that period GPS fixes are stored but do not recenter the viewport.
   */
  const onUserViewportChange = useCallback(() => {
    if (!isAutoRecenterActiveRef.current || programmaticViewportChangeCountRef.current > 0) {
      return;
    }

    hasManualViewportOverrideRef.current = true;
    isUserViewportChangePendingRef.current = true;

    if (userViewportChangeTimeoutRef.current !== null) {
      window.clearTimeout(userViewportChangeTimeoutRef.current);
    }

    userViewportChangeTimeoutRef.current = window.setTimeout(() => {
      void restoreViewportAfterUserChange();
    }, GEOLOCATION_RECENTER_AFTER_MOVEMENT_MS);
  }, [restoreViewportAfterUserChange]);

  const centerOnUserLocation = useCallback(async (animationDuration: number = 500) => {
    const map = mapRef.current;
    if (!map || isLocatingRef.current) {
      return;
    }

    isLocatingRef.current = true;
    setIsLocating(true);
    try {
      const position = await EspaceCo_Geolocation.getUsersLocation(USER_LOCATION_OPTIONS);

      if (position) {
        latestPositionRef.current = position;
        await animateToPosition(map, position, animationDuration);
      } else {
        // Fallback to default center if geolocation fails
        await animateTo(map, DEFAULT_MAP_CENTER_LON_LAT, DEFAULT_MAP_FOCUS_ZOOM, animationDuration);
      }
    } catch (error) {
      console.error("Error centering on user location:", error);
      // Fallback to default center
      await animateTo(map, DEFAULT_MAP_CENTER_LON_LAT, DEFAULT_MAP_FOCUS_ZOOM, animationDuration);
    } finally {
      isLocatingRef.current = false;
      setIsLocating(false);
    }
  }, [animateTo, animateToPosition]);

  useEffect(() => {
    isAutoRecenterActiveRef.current = isAutoRecenterActive;

    if (isAutoRecenterActive) {
      return;
    }

    hasManualViewportOverrideRef.current = false;
    isUserViewportChangePendingRef.current = false;

    if (userViewportChangeTimeoutRef.current !== null) {
      window.clearTimeout(userViewportChangeTimeoutRef.current);
      userViewportChangeTimeoutRef.current = null;
    }
  }, [isAutoRecenterActive]);

  useEffect(() => {
    if (userFollowingMode !== 'locked') {
      return;
    }

    void centerOnUserLocation(GEOLOCATION_LOCK_RECENTER_ANIMATION_DURATION_MS);

    const intervalId = window.setInterval(() => {
      void centerOnUserLocation(GEOLOCATION_LOCK_RECENTER_ANIMATION_DURATION_MS);
    }, GEOLOCATION_LOCK_RECENTER_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [centerOnUserLocation, userFollowingMode]);

  useEffect(() => {
    if (!isAutoRecenterActive) {
      return;
    }

    const map = mapRef.current!;
    let watchId: CallbackID | null = null;

    void (async () => {
      watchId = await EspaceCo_Geolocation.watchUsersLocation((position) => {
        if (!position) {
          return;
        }

        latestPositionRef.current = position;

        if (isUserViewportChangePendingRef.current) {
          return;
        }

        centerViewOnPosition(map, position, !hasManualViewportOverrideRef.current);
      }, {
        ...USER_LOCATION_OPTIONS,
        maximumAge: 1000,
        minimumUpdateInterval: GEOLOCATION_TRACKING_RECENTER_INTERVAL_MS,
        interval: GEOLOCATION_TRACKING_RECENTER_INTERVAL_MS,
      });
    })();

    return () => {
      if (watchId) {
        void EspaceCo_Geolocation.clearWatch(watchId);
      }
    };
  }, [centerViewOnPosition, isAutoRecenterActive]);

  // Initialize map
  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) {
      return;
    }

    let mounted = true;
    let initializedMap: Map | null = null;

    async function initMap() {
      if (!mapElementRef.current || !mounted) return;

      if (!skipGeoportailCapabilitiesOnInitRef.current) {
        try {
          await initGeoportailCapabilities();
        } catch (error) {
          console.error("Failed to load Geoportail capabilities:", error);
        }
      }

      if (!mounted || !mapElementRef.current) return;

      const layerCache = new LayerGroup({
        properties: {
          title: 'Cartes hors-ligne',
          name: 'cache',
          openInLayerSwitcher: false,
          displayInLayerSwitcher: true,
        },
      });

      layerCache.on('change', function () {
        if (layerCache.getLayers().getLength()) {
          layerCache.set('displayInLayerSwitcher', true);
        }
      });

      const geoportailLayer = createGeoportailLayerGroup();

      const layers = [
        geoportailLayer,
        layerCache,
        new LayerGroup({
          properties: {
            title: 'Mes couches',
            name: 'groupe',
            displayInLayerSwitcher: false,
            openInLayerSwitcher: true,
          },
        }),
        new LayerGroup({
          properties: {
            title: 'Mon guichet',
            name: 'guichet',
            visible: true,
          },
        }),
      ];

      const rotationOn = isRotationEnabledRef.current;
      initializedMap = new Map({
        target: mapElementRef.current,
        layers: layers,
        interactions: defaultInteractions({
          onFocusOnly: true,
          altShiftDragRotate: rotationOn,
          pinchRotate: rotationOn,
        }),
        controls: defaultControls({ zoom: false, attribution: false, rotate: false }).extend([
          ...(DEFAULT_MAP_SHOW_SCALELINE ? [new ScaleLine()] : []),
          new Attribution({
            collapsible: false,
            collapsed: false,
          }),
        ]),
        view: new View({
          center: fromLonLat(DEFAULT_MAP_CENTER_LON_LAT),
          zoom: DEFAULT_MAP_ZOOM,
          enableRotation: rotationOn,
        }),
      });

      mapRef.current = initializedMap;
      setMap(initializedMap);
      setIsMapReady(true);
    }

    initMap();

    return () => {
      mounted = false;
      mapRef.current?.setTarget(undefined);
      mapRef.current = null;
      setMap(null);
      setIsMapReady(false);
    };
  }, []);

  useEffect(() => {
    const olMap = mapRef.current;
    if (!olMap) {
      return;
    }

    const viewport = olMap.getViewport();
    const pointerDragListener = olMap.on('pointerdrag', onUserViewportChange);
    viewport.addEventListener('wheel', onUserViewportChange, { passive: true });
    viewport.addEventListener('touchmove', onUserViewportChange, { passive: true });

    return () => {
      unByKey(pointerDragListener);
      viewport.removeEventListener('wheel', onUserViewportChange);
      viewport.removeEventListener('touchmove', onUserViewportChange);
    };
  }, [map, onUserViewportChange]);

  useEffect(() => {
    const olMap = mapRef.current;
    if (!olMap) {
      return;
    }

    const view = olMap.getView();
    view.applyOptions_(
      view.getUpdatedOptions_({
        enableRotation: isRotationEnabled,
        ...(!isRotationEnabled ? { rotation: 0 } : {}),
      }),
    );

    const interactions = olMap.getInteractions().getArray();
    const dragRotate = interactions.find((i): i is DragRotate => i instanceof DragRotate);
    const pinchRotate = interactions.find((i): i is PinchRotate => i instanceof PinchRotate);

    if (isRotationEnabled) {
      if (!dragRotate) {
        olMap.addInteraction(new DragRotate());
      }
      if (!pinchRotate) {
        olMap.addInteraction(new PinchRotate());
      }
    } else {
      if (dragRotate) {
        olMap.removeInteraction(dragRotate);
      }
      if (pinchRotate) {
        olMap.removeInteraction(pinchRotate);
      }
    }
  }, [isRotationEnabled, map]);

  // Center on user location on mount
  useEffect(() => {
    if (!shouldCenterOnMount || !isMapReady || hasInitialCenterCompleted) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        await centerOnUserLocation();
      } finally {
        if (!cancelled) {
          setHasInitialCenterCompleted(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [centerOnUserLocation, hasInitialCenterCompleted, isMapReady, shouldCenterOnMount]);

  return {
    mapElementRef,
    mapRef,
    map,
    centerOnUserLocation,
    lockUserLocationOnMap,
    userFollowingMode,
    setUserFollowingMode,
    setIsGeolocationRecenterActive,
    onUserViewportChange,
    isLocating,
    isLockedUserLocation,
    isMapReady,
    hasInitialCenterCompleted,
  };
}
