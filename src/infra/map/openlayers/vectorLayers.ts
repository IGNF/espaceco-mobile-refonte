import type BaseLayer from "ol/layer/Base";
import type { ApiClient } from "collaboratif-client-api";
import type { EnrichedCommunityLayer } from "@/domain/community/models";
import { createLocalCollabVectorLayer } from "./localCollabVectorLayer";
import { createLocalWFSLayer } from "./localWFSLayer";
import { stripQueryParams } from "@/shared/utils/query";

/**
 * Create OpenLayers vector layers from enriched community layer data.
 * Handles WFS geoservice layers and table-based collaborative layers.
 */
export function createCommunityVectorLayers(
	layers: EnrichedCommunityLayer[],
	apiClient: ApiClient
): BaseLayer[] {
	const olLayers: BaseLayer[] = [];

	for (const layer of layers) {
		try {
			const olLayer = createVectorLayer(layer, apiClient);
			if (olLayer) {
				olLayers.push(olLayer);
			}
		} catch (err) {
			console.error(
				`[VectorLayers] Failed to create layer "${layer.title}":`,
				err
			);
		}
	}

	console.log(
		`[VectorLayers] Created ${olLayers.length} vector OL layers:`,
		olLayers.map((l) => ({ name: l.get("name"), title: l.get("title") }))
	);

	return olLayers;
}

function createVectorLayer(
	layer: EnrichedCommunityLayer,
	apiClient: ApiClient
): BaseLayer | null {
	if (layer.geoservice?.type === "WFS") {
		return createLocalWFSLayer({
			geoservice: layer.geoservice,
			visibility: layer.visible,
			opacity: layer.opacity,
		});
	}

	if (layer.table && layer.table.wfs) {
		const table = layer.table;
		return createLocalCollabVectorLayer(
			{
				database: String(layer.database),
				name: table.name,
				url: stripQueryParams(table.wfs),
				client: apiClient,
				table,
			},
			{
				tileZoom: table.minZoomLevel || 13,
				maxFeatures: 5000,
				online: true,
			}
		);
	}

	return null;
}
