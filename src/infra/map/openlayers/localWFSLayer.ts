/**
 * Local WFSLayer factory — temporary replacement for @ign/mobile-core's WFSLayer.
 *
 * The mobile-core WFSSource does not yet have a loader implementation, and WFSLayer's
 * GetCapabilities check fails when external servers are unreachable (DNS errors).
 * Additionally WFSSource.setAuthentication() throws when no credentials are provided.
 *
 * This file creates a plain OL VectorLayer with a working WFS GetFeature loader,
 * skipping GetCapabilities entirely and going straight to feature loading.
 *
 * Once mobile-core's WFSSource loader is implemented, delete this file and switch
 * back to importing WFSLayer from @ign/mobile-core.
 */

import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { bbox } from "ol/loadingstrategy";
import GeoJSON from "ol/format/GeoJSON";
import GML3 from "ol/format/GML3";
import WFS from "ol/format/WFS";
import { Collection, Feature, View } from "ol";
import { transformExtent } from "ol/proj";
import { Style, Fill, Stroke, Circle } from "ol/style";
import type { Geometry } from "ol/geom";
import type { Geoservice } from "@ign/mobile-core";

const DEFAULT_STYLES = [
	new Style({
		image: new Circle({
			fill: new Fill({ color: "rgba(255,255,255,0.4)" }),
			stroke: new Stroke({ color: "#3399CC", width: 1.25 }),
			radius: 5,
		}),
		fill: new Fill({ color: "rgba(255,255,255,0.4)" }),
		stroke: new Stroke({ color: "#3399CC", width: 1.25 }),
	}),
];

export interface LocalWFSLayerOptions {
	geoservice: Geoservice;
	visibility?: boolean;
	opacity?: number;
}

/**
 * Create an OL VectorLayer that loads features from a WFS geoservice endpoint.
 * Skips GetCapabilities and loads features directly via GetFeature.
 */
export function createLocalWFSLayer(
	options: LocalWFSLayerOptions
): VectorLayer {
	const { geoservice, visibility = true, opacity = 1 } = options;
	const isGeoJSON = geoservice.format?.toLowerCase().includes("json");

	const source = new VectorSource({
		strategy: bbox,
		features: new Collection<Feature>(),
		useSpatialIndex: true,
	});

	// Attach loader with source captured in closure
	source.setLoader(async (extent, _resolution, projection, success) => {
		try {
			const projCode =
				typeof projection === "string" ? projection : projection.getCode();
			const requestCrs = "EPSG:4326";
			const requestExtent = transformExtent(extent, projCode, requestCrs);

			const url = new URL(geoservice.url);
			url.searchParams.set("service", "WFS");
			url.searchParams.set("version", geoservice.version || "2.0.0");
			url.searchParams.set("request", "GetFeature");
			url.searchParams.set("typeNames", geoservice.layers);
			url.searchParams.set("srsName", requestCrs);
			url.searchParams.set(
				"bbox",
				requestExtent.join(",") + "," + requestCrs
			);

			if (isGeoJSON) {
				url.searchParams.set("outputFormat", "application/json");
			}

			const response = await fetch(url.toString());

			if (!response.ok) {
				throw new Error(`WFS ${response.status}: ${response.statusText}`);
			}

			let features: Feature<Geometry>[];

			if (isGeoJSON) {
				const json = await response.json();
				features = new GeoJSON().readFeatures(json, {
					dataProjection: requestCrs,
					featureProjection: projCode,
				});
			} else {
				const text = await response.text();
				const format = new WFS({ gmlFormat: new GML3() });
				features = format.readFeatures(text, {
					dataProjection: requestCrs,
					featureProjection: projCode,
				}) as Feature<Geometry>[];
			}

			source.addFeatures(features);

			console.log(
				`[WFSLayer] Loaded ${features.length} features for "${geoservice.layers}"`
			);
			if (success) success(features);
		} catch (err) {
			console.error(
				`[WFSLayer] Failed to load features for "${geoservice.layers}":`,
				err
			);
			// Call success with empty array to prevent OL from retrying endlessly
			if (success) success([]);
		}
	});

	const layer = new VectorLayer({
		source,
		visible: visibility,
		opacity,
		style: DEFAULT_STYLES,
		properties: {
			title: geoservice.title,
			description: geoservice.description,
			name: `wfs:${geoservice.layers}`,
		},
	});

	// Apply zoom constraints from geoservice
	const view = new View();
	if (geoservice.maxZoom && geoservice.maxZoom < 20) {
		view.setZoom(geoservice.maxZoom);
		layer.setMinResolution(view.getResolution() ?? 0);
	}
	if (geoservice.minZoom) {
		view.setZoom(geoservice.minZoom);
		layer.setMaxResolution(view.getResolution() ?? 0);
	}

	return layer;
}
