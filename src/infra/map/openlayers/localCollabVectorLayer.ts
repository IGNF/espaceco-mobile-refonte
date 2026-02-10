/**
 * Local CollabVectorLayer factory — temporary replacement for @ign/mobile-core's CollabVectorLayer.
 *
 * The mobile-core CollabVectorSource does not yet have a loader implementation (TODO in source).
 * This file creates a plain OL VectorLayer with a working WFS GetFeature loader so that
 * table-based collaborative features actually appear on the map.
 *
 * The collaborative API returns plain JSON objects with WKT geometries (not GeoJSON),
 * typically in Lambert 93 (IGNF:LAMB93 / EPSG:2154). This loader parses WKT,
 * transforms to the map projection, and creates OL Features.
 *
 * Once mobile-core's CollabVectorSource loader is implemented, delete this file and switch
 * back to importing CollabVectorLayer from @ign/mobile-core.
 */

import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { tile } from "ol/loadingstrategy";
import { createXYZ } from "ol/tilegrid";
import WKT from "ol/format/WKT";
import { Collection, Feature, View } from "ol";
import { transformExtent } from "ol/proj";
import proj4 from "proj4";
import { register } from "ol/proj/proj4";
import {
	CollabStyler,
	COLLAB_VECTOR_DEFAULT_VALUES,
	type Table,
	type CollabVectorLayerOptions,
	type CollabVectorSourceOptions,
} from "@ign/mobile-core";
import type { ApiClient } from "collaboratif-client-api";

type LocalCollabVectorLayerOptions = CollabVectorLayerOptions & {
	visibility?: boolean;
	opacity?: number;
};

// Register French projections so OL can transform from Lambert 93, etc.
if (!proj4.defs("EPSG:2154"))
	proj4.defs("EPSG:2154", "+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
if (!proj4.defs("IGNF:LAMB93"))
	proj4.defs("IGNF:LAMB93", "+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
register(proj4);

const wktFormat = new WKT();

/**
 * Get a Bearer token from the ApiClient for authenticated WFS requests.
 */
async function getAuthHeaders(
	client: ApiClient
): Promise<Record<string, string>> {
	try {
		if (client.clientAuth) {
			const token = await client.clientAuth.fetchToken(null);
			if (token) {
				return { Authorization: `Bearer ${token}` };
			}
		}
	} catch {
		// Token fetch failed — continue without auth
	}
	return {};
}

/**
 * Create an OL VectorLayer that replicates CollabVectorLayer behavior
 * but includes a working WFS feature loader.
 */
export function createLocalCollabVectorLayer(
	options: LocalCollabVectorLayerOptions,
	sourceOptions: Partial<CollabVectorSourceOptions> = {}
): VectorLayer {
	const table = options.table;
	const visibility = options.visibility ?? true;
	const opacity = options.opacity ?? 1;
	const tileZoom = sourceOptions.tileZoom || 13;
	const maxFeatures =
		sourceOptions.maxFeatures || COLLAB_VECTOR_DEFAULT_VALUES.MAX_FEATURES;

	// Detect native CRS from the geometry column metadata, fall back to Lambert 93
	const geometryName = table.geometryName || (table as Table & { geometry_name?: string }).geometry_name || "geometrie";
	const nativeCrs = table.columns[geometryName]?.crs || "IGNF:LAMB93";
	// Use native CRS for WFS requests to avoid WFS 1.1.0 axis order issues with EPSG:4326
	// (WFS 1.1.0 expects lat/lon for EPSG:4326, but OL gives lon/lat)
	const wfsCrs = nativeCrs === "IGNF:LAMB93" ? "EPSG:2154" : nativeCrs;

	const source = new VectorSource({
		strategy: tile(
			createXYZ({
				tileSize: COLLAB_VECTOR_DEFAULT_VALUES.TILE_SIZE,
				minZoom: tileZoom,
				maxZoom: tileZoom,
			})
		),
		features: new Collection<Feature>(),
		useSpatialIndex: true,
	});

	// Attach loader with source captured in closure
	source.setLoader(async (extent, _resolution, projection, success) => {
		try {
			const projCode =
				typeof projection === "string" ? projection : projection.getCode();

			// Transform bbox to native CRS for the WFS request
			const requestExtent = transformExtent(extent, projCode, wfsCrs);

			const url = new URL(options.url);
			url.searchParams.set("service", "WFS");
			url.searchParams.set("version", "1.1.0");
			url.searchParams.set("request", "GetFeature");
			url.searchParams.set("typeName", table.name);
			url.searchParams.set("outputFormat", "application/json");
			url.searchParams.set("srsName", wfsCrs);
			url.searchParams.set(
				"bbox",
				requestExtent.join(",") + "," + wfsCrs
			);
			url.searchParams.set("maxFeatures", String(maxFeatures));

			const headers = await getAuthHeaders(options.client);
			const response = await fetch(url.toString(), { headers });

			if (!response.ok) {
				throw new Error(`WFS ${response.status}: ${response.statusText}`);
			}

			const json = await response.json();
			const items: any[] = Array.isArray(json) ? json : json.features ?? [];

			if (items.length === 0) {
				if (success) success([]);
				return;
			}

			// Parse plain JSON objects with WKT geometries into OL Features
			const features: Feature[] = [];
			for (const item of items) {
				const wkt = item[geometryName];
				if (!wkt || typeof wkt !== "string") continue;

				try {
					const geometry = wktFormat.readGeometry(wkt, {
						dataProjection: nativeCrs,
						featureProjection: projCode,
					});

					const feature = new Feature({ geometry });

					// Copy all non-geometry properties
					for (const key of Object.keys(item)) {
						if (key !== geometryName) {
							feature.set(key, item[key], true); // true = silent
						}
					}

					features.push(feature);
				} catch {
					// Skip features with unparseable geometry
				}
			}

			source.addFeatures(features);

			console.log(
				`[CollabVector] Loaded ${features.length} features for "${table.name}"`
			);
			if (success) success(features);
		} catch (err) {
			console.error(
				`[CollabVector] Failed to load features for "${table.name}":`,
				err
			);
			if (success) success([]);
		}
	});

	const layer = new VectorLayer({
		source,
		visible: visibility,
		opacity,
		properties: {
			name: options.database + ":" + table.name,
			title: table.title,
		},
	});

	applyZoomConstraints(layer, table, tileZoom);

	// Apply collaborative styling from mobile-core
	try {
		const styleFunction = CollabStyler.getFeatureStyleFunction(
			table,
			"",
			sourceOptions as any
		);
		layer.setStyle(styleFunction as any);
	} catch (err) {
		console.warn(
			`[LocalCollabVectorLayer] Style failed for "${table.name}", using defaults:`,
			err
		);
	}

	return layer;
}

function applyZoomConstraints(layer: VectorLayer, table: Table, tileZoom: number) {
	const view = new View();

	if (table.maxZoomLevel && table.maxZoomLevel < 20) {
		view.setZoom(table.maxZoomLevel);
		layer.setMinResolution(view.getResolution() ?? 0);
	}

	// Ensure layer is only visible at/above the tile zoom level to prevent
	// exponential tile explosion at low zooms (e.g. 4^(13-5) = 262k tiles)
	const effectiveMinZoom = Math.max(table.minZoomLevel ?? 0, tileZoom);
	view.setZoom(Math.max(effectiveMinZoom, 4));
	layer.setMaxResolution((view.getResolution() ?? 0) + 1);
}
