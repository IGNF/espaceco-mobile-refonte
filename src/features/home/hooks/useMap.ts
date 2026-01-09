import { useEffect, useRef, useCallback, useState } from "react";
import Map from "ol/Map";
import View from "ol/View";
import { defaults as defaultControls } from "ol/control";
import ScaleLine from "ol/control/ScaleLine";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import { fromLonLat } from "ol/proj";
import "ol/ol.css";
import { EspaceCo_Geolocation } from "@/platform/device/geolocation";
import {
	DEFAULT_MAP_CENTER_LON_LAT,
	DEFAULT_MAP_FOCUS_ZOOM,
	DEFAULT_MAP_SHOW_SCALELINE,
	DEFAULT_MAP_ZOOM,
} from "@/shared/constants/map";

interface UseMapOptions {
	centerOnUserLocation?: boolean;
}

interface UseMapReturn {
	mapElementRef: React.RefObject<HTMLDivElement | null>;
	centerOnUserLocation: () => Promise<void>;
	isLocating: boolean;
}

export function useMap(options: UseMapOptions = {}): UseMapReturn {
	const { centerOnUserLocation: shouldCenterOnMount = true } = options;

	const mapElementRef = useRef<HTMLDivElement | null>(null);
	const mapRef = useRef<Map | null>(null);
	const [isLocating, setIsLocating] = useState(false);

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
				map.getView().animate({
					center: fromLonLat([longitude, latitude]),
					zoom: DEFAULT_MAP_FOCUS_ZOOM,
					duration: 500,
				});
			} else {
				// Fallback to default center if geolocation fails
				map.getView().animate({
					center: fromLonLat(DEFAULT_MAP_CENTER_LON_LAT),
					zoom: DEFAULT_MAP_FOCUS_ZOOM,
					duration: 500,
				});
			}
		} catch (error) {
			console.error("Error centering on user location:", error);
			// Fallback to default center
			map.getView().animate({
				center: fromLonLat(DEFAULT_MAP_CENTER_LON_LAT),
				zoom: DEFAULT_MAP_FOCUS_ZOOM,
				duration: 500,
			});
		} finally {
			setIsLocating(false);
		}
	}, []);

	// Initialize map
	useEffect(() => {
		if (!mapElementRef.current || mapRef.current) {
			return;
		}

		mapRef.current = new Map({
			target: mapElementRef.current,
			layers: [
				new TileLayer({
					source: new OSM(),
				}),
			],
			controls: defaultControls({ zoom: false }).extend(
				DEFAULT_MAP_SHOW_SCALELINE ? [new ScaleLine()] : []
			),
			view: new View({
				center: fromLonLat(DEFAULT_MAP_CENTER_LON_LAT),
				zoom: DEFAULT_MAP_ZOOM,
			}),
		});

		return () => {
			mapRef.current?.setTarget(undefined);
			mapRef.current = null;
		};
	}, []);

	// Center on user location on mount
	useEffect(() => {
		if (shouldCenterOnMount && mapRef.current) {
			centerOnUserLocation();
		}
	}, [shouldCenterOnMount, centerOnUserLocation]);

	return {
		mapElementRef,
		centerOnUserLocation,
		isLocating,
	};
}
