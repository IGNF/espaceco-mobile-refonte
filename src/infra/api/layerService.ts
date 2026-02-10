import { collabApiClient } from "./collabApiClient";
import type { EnrichedCommunityLayer } from "@/domain/community/models";
import {
	mapApiGeoservice,
	mapApiLayerToEnrichedCommunityLayer,
	mapApiTable,
} from "@/domain/community/layerMappers";

/**
 * Fetch community layers and enrich them with full geoservice data, table data, and database extents.
 * TODO: this needs to be cached
 */
export async function fetchEnrichedCommunityLayers(
	communityId: number
): Promise<EnrichedCommunityLayer[]> {
	const response = await collabApiClient.layer.getAll(communityId, {
		limit: 100,
	});
	const layers: EnrichedCommunityLayer[] = (response.data ?? []).map(
		(layer: unknown) => mapApiLayerToEnrichedCommunityLayer(layer)
	);

	// Parallel fetch: geoservice or table data for each layer
	const enrichmentPromises = layers.map((layer) => fetchLayerData(layer));

	// Fetch database extents in parallel for table-based layers
	const uniqueDatabaseIds = getUniqueDatabaseIds(layers);
	const databaseExtentsMap = await fetchDatabaseExtents(uniqueDatabaseIds);

	// Merge fetched data back into layers
	const enrichedData = await Promise.all(enrichmentPromises);
	enrichLayers(layers, enrichedData, databaseExtentsMap);

	console.log(`[Layers] Fetched ${layers.length} layers for community ${communityId}:`,
		layers.map(l => ({ id: l.id, title: l.title, geoserviceType: l.geoservice?.type, hasTable: !!l.table }))
	);

	return layers;
}

/**
 * Fetch geoservice or table data for a single layer.
 */
async function fetchLayerData(layer: EnrichedCommunityLayer): Promise<any> {
	const geoserviceId = getLayerGeoserviceId(layer);
	if (geoserviceId !== null) {
		try {
			const geoserviceResponse = await collabApiClient.geoservice.get(
				geoserviceId
			);
			return { type: "geoservice", data: mapApiGeoservice(geoserviceResponse.data) };
		} catch {
			return null;
		}
	}

	const tableId = getLayerTableId(layer);
	const databaseId = getLayerDatabaseId(layer);
	if (tableId !== null && databaseId !== null) {
		try {
			const tableResponse = await collabApiClient.table.get(databaseId, tableId);
			return { type: "table", data: mapApiTable(tableResponse.data) };
		} catch {
			return null;
		}
	}

	return null;
}

/**
 * Extract unique database IDs from layers that have table data.
 */
function getUniqueDatabaseIds(layers: EnrichedCommunityLayer[]): number[] {
	const databaseIds = new Set<number>();
	for (const layer of layers) {
		const tableId = getLayerTableId(layer);
		const databaseId = getLayerDatabaseId(layer);
		if (tableId !== null && databaseId !== null) {
			databaseIds.add(databaseId);
		}
	}
	return Array.from(databaseIds);
}

/**
 * Fetch database extents for all database IDs.
 */
async function fetchDatabaseExtents(databaseIds: number[]): Promise<Record<number, string>> {
	if (databaseIds.length === 0) {
		return {};
	}

	const databasePromises = databaseIds.map(dbId =>
		collabApiClient.database.get(dbId, { fields: "extent,id" })
	);
	const databaseResponses = await Promise.all(databasePromises);

	const extentsMap: Record<number, string> = {};
	for (const response of databaseResponses) {
		const databaseId = Number(response.data?.id);
		if (Number.isFinite(databaseId) && typeof response.data?.extent === "string") {
			extentsMap[databaseId] = response.data.extent;
		}
	}
	return extentsMap;
}

/**
 * Enrich layers with fetched geoservice/table data and database extents.
 */
function enrichLayers(
	layers: EnrichedCommunityLayer[],
	enrichedData: any[],
	databaseExtentsMap: Record<number, string>
): void {
	for (let i = 0; i < layers.length; i++) {
		const data = enrichedData[i];
		if (!data) continue;

		if (data.type === "geoservice") {
			layers[i].geoservice = data.data;
		} else if (data.type === "table") {
			layers[i].table = data.data;

			const dbId = layers[i].database;
			if (dbId && databaseExtentsMap[dbId]) {
				layers[i].extent = databaseExtentsMap[dbId].split(',');
			}
		}
	}
}

function getLayerGeoserviceId(layer: EnrichedCommunityLayer): number | null {
	const geoserviceAny = layer.geoservice as unknown;
	if (typeof geoserviceAny === "number") {
		return geoserviceAny;
	}
	if (geoserviceAny && typeof geoserviceAny === "object") {
		const id = Number((geoserviceAny as { id?: unknown }).id);
		if (Number.isFinite(id)) {
			return id;
		}
	}
	return null;
}

function getLayerTableId(layer: EnrichedCommunityLayer): number | null {
	const tableAny = layer.table as unknown;
	if (typeof tableAny === "number") {
		return tableAny;
	}
	if (tableAny && typeof tableAny === "object") {
		const id = Number((tableAny as { id?: unknown }).id);
		if (Number.isFinite(id)) {
			return id;
		}
	}
	return null;
}

function getLayerDatabaseId(layer: EnrichedCommunityLayer): number | null {
	const databaseId = Number(layer.database);
	return Number.isFinite(databaseId) ? databaseId : null;
}

/**
 * Filter enriched layers to only keep Geoportail WMTS layers.
 */
export function filterGeoportailLayers(
	layers: EnrichedCommunityLayer[]
): EnrichedCommunityLayer[] {
	const filtered = layers.filter((layer) => {
		const gs = layer.geoservice;
		if (!gs) return false;
		// API can return 'WMTS' even though the library type only declares 'WFS' | 'WMS'
		const isWMTS = (gs.type as string) === "WMTS";
		const isGeoportail =
			gs.url?.includes("geoportail") || gs.url?.includes("data.geopf");
		return isWMTS && isGeoportail;
	});

	console.log(`[Layers] Filtered ${filtered.length}/${layers.length} Geoportail WMTS layers:`,
		filtered.map(l => ({ title: l.title, wmtsLayer: l.geoservice?.layers, visible: l.visible }))
	);

	return filtered;
}

/**
 * Filter enriched layers to only keep vector layers (WFS geoservices or table-based with WFS endpoint).
 */
export function filterVectorLayers(
	layers: EnrichedCommunityLayer[]
): EnrichedCommunityLayer[] {
	const filtered = layers.filter((layer) => {
		if (layer.geoservice?.type === "WFS") return true;
		if (layer.table && layer.table.wfs) return true;
		return false;
	});

	console.log(`[Layers] Filtered ${filtered.length}/${layers.length} vector layers:`,
		filtered.map(l => ({
			title: l.title,
			type: l.geoservice?.type === "WFS" ? "WFS geoservice" : "table-based",
		}))
	);

	return filtered;
}
