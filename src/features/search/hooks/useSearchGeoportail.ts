import { useEffect, useRef, useCallback } from "react";
import type Map from "ol/Map";
import Overlay from "ol/Overlay";
import SearchGeoportail from "ol-ext/control/SearchGeoportail";
import type { Options as SearchGeoportailOptions } from "ol-ext/control/SearchGeoportail";
import SearchGeoportailParcelle from "ol-ext/control/SearchGeoportailParcelle";
import type { Options as SearchGeoportailParcelleOptions } from "ol-ext/control/SearchGeoportailParcelle";
import type { SearchEvent } from "ol-ext/control/Search";
import {
	DEFAULT_MAP_SEARCH_ZOOM,
	GEOPORTAIL_API_KEY,
} from "@/shared/constants/map";

import "ol-ext/control/Search.css";

interface UseSearchGeoportailOptions {
	map: Map | null;
	addressContainerRef: React.RefObject<HTMLDivElement | null>;
	parcelleContainerRef: React.RefObject<HTMLDivElement | null>;
	isOpen: boolean;
}

export interface UseSearchGeoportailReturn {
	clearMarker: () => void;
}

export function useSearchGeoportail({
	map,
	addressContainerRef,
	parcelleContainerRef,
	isOpen,
}: UseSearchGeoportailOptions): UseSearchGeoportailReturn {
	const overlayRef = useRef<Overlay | null>(null);

	const clearMarker = useCallback(() => {
		if (overlayRef.current && map) {
			map.removeOverlay(overlayRef.current);
			overlayRef.current.getElement()?.remove();
			overlayRef.current = null;
		}
	}, [map]);

	const showMarkerAtCoordinate = useCallback(
		(coordinate: number[]) => {
			if (!map) return;

			// Remove previous marker
			clearMarker();

			// Create pulsing marker element
			const markerEl = document.createElement("div");
			markerEl.className = "search-marker-pulse";

			const overlay = new Overlay({
				element: markerEl,
				position: coordinate,
				positioning: "center-center",
				stopEvent: false,
			});

			overlayRef.current = overlay;
			map.addOverlay(overlay);

			// Center map on result
			map.getView().animate({
				center: coordinate,
				zoom: Math.max(map.getView().getZoom() ?? DEFAULT_MAP_SEARCH_ZOOM, DEFAULT_MAP_SEARCH_ZOOM),
				duration: 500,
			});
		},
		[map, clearMarker],
	);

	useEffect(() => {
		if (!map || !isOpen) return;
		if (!addressContainerRef.current || !parcelleContainerRef.current) return;

		const addressOptions: SearchGeoportailOptions = {
			target: addressContainerRef.current,
			apiKey: GEOPORTAIL_API_KEY,
			collapsed: false,
			noCollapse: true,
		};
		(addressOptions as Record<string, unknown>).type = "StreetAddress,PositionOfInterest";

		const addressSearch = new SearchGeoportail(addressOptions);
		addressSearch.setMap(map);

		addressSearch.on("select", (e: SearchEvent) => {
			if (e.coordinate) {
				showMarkerAtCoordinate(e.coordinate);
			}
			// Clear autocomplete list after selection
			const ul = addressContainerRef.current?.querySelector("ul.autocomplete");
			if (ul) ul.innerHTML = "";
		});

		const parcelleOptions: SearchGeoportailParcelleOptions = {
			target: parcelleContainerRef.current,
			apiKey: GEOPORTAIL_API_KEY,
			collapsed: false,
			noCollapse: true,
		};

		const parcelleSearch = new SearchGeoportailParcelle(parcelleOptions);
		parcelleSearch.setMap(map);

		(parcelleSearch as unknown as { addEventListener: (type: string, listener: (e: Event & { coordinate?: number[] }) => void) => void })
			.addEventListener("parcelle", (e) => {
				if (e.coordinate) {
					showMarkerAtCoordinate(e.coordinate);
				}
				const container = parcelleContainerRef.current;
				const ulParcelle = container?.querySelector("ul.autocomplete-parcelle");
				if (ulParcelle) ulParcelle.innerHTML = "";
				const ulPage = container?.querySelector("ul.autocomplete-page");
				if (ulPage) ulPage.innerHTML = "";
			});

		return () => {
			// Cleanup controls
			addressSearch.setMap(null as unknown as Map);
			parcelleSearch.setMap(null as unknown as Map);

			// Cleanup marker
			if (overlayRef.current) {
				map.removeOverlay(overlayRef.current);
				overlayRef.current.getElement()?.remove();
				overlayRef.current = null;
			}
		};
	}, [map, isOpen, addressContainerRef, parcelleContainerRef, showMarkerAtCoordinate]);

	return { clearMarker };
}
