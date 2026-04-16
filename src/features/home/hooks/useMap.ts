import { useEffect, useRef, useCallback, useState } from "react";
import Map from "ol/Map";
import View from "ol/View";
import { Attribution, defaults as defaultControls } from "ol/control";
import ScaleLine from "ol/control/ScaleLine";
import LayerGroup from "ol/layer/Group";
import { fromLonLat } from "ol/proj";
import "ol/ol.css";
import { EspaceCo_Geolocation } from "@/platform/device/geolocation";
import {
	DEFAULT_MAP_CENTER_LON_LAT,
	DEFAULT_MAP_FOCUS_ZOOM,
	DEFAULT_MAP_SHOW_SCALELINE,
	DEFAULT_MAP_ZOOM,
} from "@/shared/constants/map";
import {
	initGeoportailCapabilities,
	createGeoportailLayerGroup,
} from "@/infra/map/openlayers/geoportailLayers";

interface UseMapOptions {
	centerOnUserLocation?: boolean;
  skipGeoportailCapabilities?: boolean;
}

interface UseMapReturn {
	mapElementRef: React.RefObject<HTMLDivElement | null>;
	mapRef: React.RefObject<Map | null>;
	map: Map | null;
	centerOnUserLocation: () => Promise<void>;
	isLocating: boolean;
	isMapReady: boolean;
	hasInitialCenterCompleted: boolean;
}

export function useMap(options: UseMapOptions = {}): UseMapReturn {
	const {
    centerOnUserLocation: shouldCenterOnMount = true,
    skipGeoportailCapabilities = false,
  } = options;

	const mapElementRef = useRef<HTMLDivElement | null>(null);
	const mapRef = useRef<Map | null>(null);
  const skipGeoportailCapabilitiesOnInitRef = useRef(skipGeoportailCapabilities);
	const [map, setMap] = useState<Map | null>(null);
	const [isLocating, setIsLocating] = useState(false);
	const [isMapReady, setIsMapReady] = useState(false);
	const [hasInitialCenterCompleted, setHasInitialCenterCompleted] = useState(
		() => !shouldCenterOnMount
	);

	const animateTo = useCallback(async (map: Map, centerLonLat: [number, number]) => {
		await new Promise<void>((resolve) => {
			map.getView().animate(
				{
					center: fromLonLat(centerLonLat),
					zoom: DEFAULT_MAP_FOCUS_ZOOM,
					duration: 500,
				},
				() => resolve()
			);
		});
	}, []);

	const centerOnUserLocation = useCallback(async () => {
		const map = mapRef.current;
		if (!map) {
			return;
		}

		setIsLocating(true);
		try {
			const position = await EspaceCo_Geolocation.getUsersLocation({
				enableHighAccuracy: true,
				timeout: 10000,
			});

			if (position) {
				const { longitude, latitude } = position.coords;
				await animateTo(map, [longitude, latitude]);
			} else {
				// Fallback to default center if geolocation fails
				await animateTo(map, DEFAULT_MAP_CENTER_LON_LAT);
			}
		} catch (error) {
			console.error("Error centering on user location:", error);
			// Fallback to default center
			await animateTo(map, DEFAULT_MAP_CENTER_LON_LAT);
		} finally {
			setIsLocating(false);
		}
	}, [animateTo]);

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

			initializedMap = new Map({
				target: mapElementRef.current,
				layers: layers,
				controls: defaultControls({ zoom: false, attribution: false }).extend([
					...(DEFAULT_MAP_SHOW_SCALELINE ? [new ScaleLine()] : []),
					new Attribution({
						collapsible: false,
						collapsed: false,
					}),
				]),
				view: new View({
					center: fromLonLat(DEFAULT_MAP_CENTER_LON_LAT),
					zoom: DEFAULT_MAP_ZOOM,
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
		isLocating,
		isMapReady,
		hasInitialCenterCompleted,
	};
}
