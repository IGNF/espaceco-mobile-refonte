import type { TableColumn } from "@ign/mobile-core";
import { collabApiClient } from "./collabApiClient";
import type { EnrichedCommunityLayer } from "@/domain/community/models";

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
	const layers: EnrichedCommunityLayer[] = response.data ?? [];

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
	const layerAny = layer as any;
	if (layerAny.geoservice && typeof layerAny.geoservice === "object" && "id" in layerAny.geoservice) {
		try {
			const geoserviceResponse = await collabApiClient.geoservice.get(
				(layerAny.geoservice as { id: number }).id
			);
			return { type: "geoservice", data: geoserviceResponse.data };
		} catch {
			return null;
		}
	} else if (layerAny.table && layerAny.database) {
		try {
			const tableResponse = await collabApiClient.table.get(layerAny.database, layerAny.table);
			return { type: "table", data: tableResponse.data };
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
		const layerAny = layer as any;
		if (layerAny.table && layerAny.database) {
			databaseIds.add(layerAny.database);
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
		if (response.data?.extent) {
			extentsMap[response.data.id] = response.data.extent;
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
			const table = data.data;
			if (table.columns && typeof table.columns === "object") {
				const rawValues = Object.values(table.columns) as TableColumn[];
				const columnsRecord: Record<string, TableColumn> = {};
				for (const col of rawValues) {
					if (col.name) {
						columnsRecord[col.name] = col;
					}
				}
				table.columns = columnsRecord;
			}
			layers[i].table = table;

			const dbId = layers[i].database;
			if (dbId && databaseExtentsMap[dbId]) {
				layers[i].extent = databaseExtentsMap[dbId].split(',');
			}
		}
	}
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
