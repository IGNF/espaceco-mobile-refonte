import { useEffect } from "react";
import type { RefObject } from "react";
import type Map from "ol/Map";
import type LayerGroup from "ol/layer/Group";
import type { CommunityLayer } from "@ign/mobile-core";
import { createCommunityGeoportailLayers } from "@/infra/map/openlayers/geoportailLayers";
import { createCommunityVectorLayers } from "@/infra/map/openlayers/vectorLayers";
import { collabApiClient } from "@/infra/api/collabApiClient";

/**
 * Find a layer group by its "name" property on the map.
 */
function findLayerGroup(map: Map, name: string): LayerGroup | undefined {
	return map
		.getLayers()
		.getArray()
		.find(
			(layer) => layer.get("name") === name
		) as LayerGroup | undefined;
}

/**
 * Syncs enriched community layers to the map's layer groups:
 * - Geoportail WMTS layers go into the "groupe" group
 * - Vector layers (WFS + table-based) go into the "guichet" group
 */
export function useCommunityMapLayers(
	mapRef: RefObject<Map | null>,
	geoportailLayers: CommunityLayer[],
	vectorLayers: CommunityLayer[],
	isMapReady: boolean
) {
	// Sync Geoportail WMTS layers to "groupe" group
	useEffect(() => {
		if (!isMapReady) return;

		const map = mapRef.current;
		if (!map) return;

		const groupe = findLayerGroup(map, "groupe");
		if (!groupe) return;

		groupe.getLayers().clear();

		if (geoportailLayers.length === 0) {
			console.log('[Layers] Cleared "groupe" layers (no Geoportail layers for active community)');
			return;
		}

		const olLayers = createCommunityGeoportailLayers(geoportailLayers);
		console.log(`[Layers] Adding ${olLayers.length} OL layers to "groupe" group:`,
			olLayers.map(l => ({ name: l.get("name"), visible: l.getVisible(), opacity: l.getOpacity() }))
		);
		for (const layer of olLayers) {
			groupe.getLayers().push(layer);
		}
	}, [mapRef, geoportailLayers, isMapReady]);

	// Sync vector layers to "guichet" group
	useEffect(() => {
		if (!isMapReady) return;

		const map = mapRef.current;
		if (!map) return;

		const guichet = findLayerGroup(map, "guichet");
		if (!guichet) return;

		guichet.getLayers().clear();

		if (vectorLayers.length === 0) {
			console.log('[Layers] Cleared "guichet" layers (no vector layers for active community)');
			return;
		}

		const olLayers = createCommunityVectorLayers(vectorLayers, collabApiClient);
		console.log(`[Layers] Adding ${olLayers.length} vector OL layers to "guichet" group:`,
			olLayers.map(l => ({ name: l.get("name"), title: l.get("title") }))
		);
		for (const layer of olLayers) {
			guichet.getLayers().push(layer);
		}
	}, [mapRef, vectorLayers, isMapReady]);
}
