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
	const geoservice = layer.geoservice;
	if (geoservice && (geoservice.type as string)?.toUpperCase() === "WFS") {
		return createLocalWFSLayer({
			geoservice,
			visibility: getLayerVisibility(layer),
			opacity: getLayerOpacity(layer),
		});
	}

	const wfsUrl = getTableWfsUrl(layer);
	if (layer.table && wfsUrl) {
		const table = layer.table;
		return createLocalCollabVectorLayer(
			{
				database: String(layer.database),
				name: table.name,
				url: stripQueryParams(wfsUrl),
				client: apiClient,
				table,
				visibility: getLayerVisibility(layer),
				opacity: getLayerOpacity(layer),
			},
			{
				tileZoom: getTableTileZoom(layer),
				maxFeatures: 5000,
				online: true,
			}
		);
	}

	return null;
}

function getLayerVisibility(layer: EnrichedCommunityLayer): boolean | undefined {
	const visibility = (layer as EnrichedCommunityLayer & { visibility?: boolean }).visibility;
	return layer.visible ?? visibility;
}

function getLayerOpacity(layer: EnrichedCommunityLayer): number | undefined {
	return typeof layer.opacity === "number" ? layer.opacity : undefined;
}

function getTableWfsUrl(layer: EnrichedCommunityLayer): string | undefined {
	const tableAny = layer.table as { wfs?: unknown; wfs_url?: unknown } | undefined;
	if (!tableAny) return undefined;

	if (typeof tableAny.wfs === "string" && tableAny.wfs.length > 0) {
		return tableAny.wfs;
	}

	if (typeof tableAny.wfs_url === "string" && tableAny.wfs_url.length > 0) {
		return tableAny.wfs_url;
	}

	return undefined;
}

function getTableTileZoom(layer: EnrichedCommunityLayer): number {
	const tableAny = layer.table as {
		tileZoomLevel?: unknown;
		tile_zoom_level?: unknown;
		minZoomLevel?: unknown;
		min_zoom_level?: unknown;
	} | undefined;

	if (!tableAny) return 13;

	const rawTileZoom =
		tableAny.tileZoomLevel ??
		tableAny.tile_zoom_level ??
		tableAny.minZoomLevel ??
		tableAny.min_zoom_level;
	const tileZoom = Number(rawTileZoom);
	return Number.isFinite(tileZoom) ? tileZoom : 13;
}
