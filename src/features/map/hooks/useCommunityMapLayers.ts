import { useEffect } from "react";
import type { RefObject } from "react";
import type Map from "ol/Map";
import type LayerGroup from "ol/layer/Group";
import type { EnrichedCommunityLayer } from "@/domain/community/models";
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
	geoportailLayers: EnrichedCommunityLayer[],
	vectorLayers: EnrichedCommunityLayer[]
) {
	// Sync Geoportail WMTS layers to "groupe" group
	useEffect(() => {
		const map = mapRef.current;
		if (!map || geoportailLayers.length === 0) return;

		const groupe = findLayerGroup(map, "groupe");
		if (!groupe) return;

		groupe.getLayers().clear();

		const olLayers = createCommunityGeoportailLayers(geoportailLayers);
		console.log(`[Layers] Adding ${olLayers.length} OL layers to "groupe" group:`,
			olLayers.map(l => ({ name: l.get("name"), visible: l.getVisible(), opacity: l.getOpacity() }))
		);
		for (const layer of olLayers) {
			groupe.getLayers().push(layer);
		}
	}, [mapRef, geoportailLayers]);

	// Sync vector layers to "guichet" group
	useEffect(() => {
		const map = mapRef.current;
		if (!map || vectorLayers.length === 0) return;

		const guichet = findLayerGroup(map, "guichet");
		if (!guichet) return;

		guichet.getLayers().clear();

		const olLayers = createCommunityVectorLayers(vectorLayers, collabApiClient);
		console.log(`[Layers] Adding ${olLayers.length} vector OL layers to "guichet" group:`,
			olLayers.map(l => ({ name: l.get("name"), title: l.get("title") }))
		);
		for (const layer of olLayers) {
			guichet.getLayers().push(layer);
		}
	}, [mapRef, vectorLayers]);
}
