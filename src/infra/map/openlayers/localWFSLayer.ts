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
import { all as allLoadingStrategy, bbox } from "ol/loadingstrategy";
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

const WFS_REQUEST_KEYS = new Set([
	"service",
	"request",
	"version",
	"typenames",
	"typename",
	"srsname",
	"bbox",
]);

const WFS_FILTER_KEYS = new Set(["cql_filter", "filter"]);

interface ParsedLayerSpec {
	typeNames: string;
	extraParams: Array<[string, string]>;
}

interface WfsUrlOptions {
	includeOutputFormat: boolean;
	includeFilters: boolean;
	includeBbox: boolean;
}

interface WfsRequestVariant extends WfsUrlOptions {
	name: string;
}

function parseLayerSpec(rawLayerName: string): ParsedLayerSpec {
	const trimmed = rawLayerName.trim();
	if (!trimmed) {
		return { typeNames: "", extraParams: [] };
	}

	let typeNames = trimmed;
	let queryPart = "";

	if (typeNames.includes("?")) {
		const [namePart, ...queryParts] = typeNames.split("?");
		typeNames = namePart;
		queryPart = queryParts.join("?");
	}

	if (typeNames.includes("&")) {
		const [namePart, ...queryParts] = typeNames.split("&");
		typeNames = namePart;
		queryPart = [queryPart, queryParts.join("&")].filter(Boolean).join("&");
	}

	const extraParams = Array.from(new URLSearchParams(queryPart).entries());
	return {
		typeNames: typeNames.trim(),
		extraParams,
	};
}

function buildWfsGetFeatureUrl(
	geoservice: Geoservice,
	typeNames: string,
	layerExtraParams: Array<[string, string]>,
	requestCrs: string,
	requestExtent: number[],
	isGeoJSON: boolean,
	options: WfsUrlOptions
): URL {
	const originalUrl = new URL(geoservice.url);
	const finalUrl = new URL(originalUrl.origin + originalUrl.pathname);
	const preservedParams = new Map<string, { key: string; values: string[] }>();

	const addPreservedParam = (key: string, value: string) => {
		const lowerKey = key.toLowerCase();
		if (WFS_REQUEST_KEYS.has(lowerKey)) return;
		if (lowerKey === "outputformat") return;
		if (!options.includeFilters && WFS_FILTER_KEYS.has(lowerKey)) return;

		const existing = preservedParams.get(lowerKey);
		if (existing) {
			existing.values.push(value);
		} else {
			preservedParams.set(lowerKey, { key, values: [value] });
		}
	};

	for (const [key, value] of originalUrl.searchParams.entries()) {
		addPreservedParam(key, value);
	}
	for (const [key, value] of layerExtraParams) {
		addPreservedParam(key, value);
	}

	for (const { key, values } of preservedParams.values()) {
		for (const value of values) {
			finalUrl.searchParams.append(key, value);
		}
	}

	finalUrl.searchParams.set("service", "WFS");
	finalUrl.searchParams.set("version", geoservice.version || "2.0.0");
	finalUrl.searchParams.set("request", "GetFeature");
	finalUrl.searchParams.set("typeNames", typeNames);
	finalUrl.searchParams.set("srsName", requestCrs);
	if (options.includeBbox) {
		finalUrl.searchParams.set("bbox", requestExtent.join(",") + "," + requestCrs);
	}

	if (isGeoJSON && options.includeOutputFormat) {
		finalUrl.searchParams.set("outputFormat", "application/json");
	}

	return finalUrl;
}

function hasFilterParams(
	geoservice: Geoservice,
	layerExtraParams: Array<[string, string]>
): boolean {
	const hasFilterInUrl = Array.from(new URL(geoservice.url).searchParams.keys()).some(
		(key) => WFS_FILTER_KEYS.has(key.toLowerCase())
	);
	const hasFilterInLayerParams = layerExtraParams.some(([key]) =>
		WFS_FILTER_KEYS.has(key.toLowerCase())
	);
	return hasFilterInUrl || hasFilterInLayerParams;
}

function getWfsRequestVariants(isGeoJSON: boolean, hasFilter: boolean): WfsRequestVariant[] {
	const variants: WfsRequestVariant[] = [];

	if (hasFilter) {
		variants.push({
			name: "filter-no-bbox",
			includeOutputFormat: isGeoJSON,
			includeFilters: true,
			includeBbox: false,
		});

		if (isGeoJSON) {
			variants.push({
				name: "filter-no-bbox-no-output-format",
				includeOutputFormat: false,
				includeFilters: true,
				includeBbox: false,
			});
		}

		variants.push({
			name: "no-filter-with-bbox",
			includeOutputFormat: isGeoJSON,
			includeFilters: false,
			includeBbox: true,
		});

		if (isGeoJSON) {
			variants.push({
				name: "no-filter-with-bbox-no-output-format",
				includeOutputFormat: false,
				includeFilters: false,
				includeBbox: true,
			});
		}

		variants.push({
			name: "no-filter-no-bbox",
			includeOutputFormat: isGeoJSON,
			includeFilters: false,
			includeBbox: false,
		});

		if (isGeoJSON) {
			variants.push({
				name: "no-output-format-no-filter",
				includeOutputFormat: false,
				includeFilters: false,
				includeBbox: false,
			});
		}
	} else {
		variants.push({
			name: "default",
			includeOutputFormat: isGeoJSON,
			includeFilters: true,
			includeBbox: true,
		});

		if (isGeoJSON) {
			variants.push({
				name: "no-output-format",
				includeOutputFormat: false,
				includeFilters: true,
				includeBbox: true,
			});
		}
	}

	return variants;
}

function getQueryParamCaseInsensitive(
	searchParams: URLSearchParams,
	key: string
): string | null {
	const lowerTarget = key.toLowerCase();
	for (const [paramKey, paramValue] of searchParams.entries()) {
		if (paramKey.toLowerCase() === lowerTarget) {
			return paramValue;
		}
	}
	return null;
}

function getTypeNamesFromGeoserviceUrl(geoservice: Geoservice): string | undefined {
	const url = new URL(geoservice.url);
	return (
		getQueryParamCaseInsensitive(url.searchParams, "typeNames") ??
		getQueryParamCaseInsensitive(url.searchParams, "typeName") ??
		undefined
	);
}

function resolveInitialTypeNames(
	geoservice: Geoservice,
	parsedTypeNames: string
): string {
	const typeNamesFromUrl = getTypeNamesFromGeoserviceUrl(geoservice)?.trim();
	if (!parsedTypeNames) {
		return typeNamesFromUrl || geoservice.layers;
	}
	if (!parsedTypeNames.includes(":") && typeNamesFromUrl?.includes(":")) {
		return typeNamesFromUrl;
	}
	return parsedTypeNames;
}

function extractUnknownFeatureTypeName(message: string): string | undefined {
	const match = message.match(/Feature type\s*:?\s*([^\s]+)\s+unknown/i);
	return match?.[1];
}

function buildWfsGetCapabilitiesUrl(geoservice: Geoservice): URL {
	const originalUrl = new URL(geoservice.url);
	const url = new URL(originalUrl.origin + originalUrl.pathname);

	for (const [key, value] of originalUrl.searchParams.entries()) {
		const lowerKey = key.toLowerCase();
		if (WFS_REQUEST_KEYS.has(lowerKey)) continue;
		if (WFS_FILTER_KEYS.has(lowerKey)) continue;
		if (lowerKey === "outputformat") continue;
		url.searchParams.append(key, value);
	}

	url.searchParams.set("service", "WFS");
	url.searchParams.set("version", geoservice.version || "2.0.0");
	url.searchParams.set("request", "GetCapabilities");
	return url;
}

function parseWfsFeatureTypeNamesFromCapabilities(payload: string): string[] {
	const trimmed = payload.trim();
	if (!trimmed.startsWith("<")) return [];

	const document = new DOMParser().parseFromString(trimmed, "application/xml");
	if (document.querySelector("parsererror")) return [];

	const featureTypes = Array.from(document.getElementsByTagNameNS("*", "FeatureType"));
	const names = featureTypes
		.map((featureType) => {
			const nameNodes = featureType.getElementsByTagNameNS("*", "Name");
			return nameNodes[0]?.textContent?.trim() ?? "";
		})
		.filter((name) => name.length > 0);

	return Array.from(new Set(names));
}

function selectFallbackTypeNames(
	requestedTypeName: string,
	candidates: string[]
): string | undefined {
	if (requestedTypeName.includes(",") || requestedTypeName.includes(":")) {
		return undefined;
	}

	const exact = candidates.find((candidate) => candidate === requestedTypeName);
	if (exact) return exact;

	const prefixedCandidates = candidates.filter((candidate) =>
		candidate.startsWith(`${requestedTypeName}:`)
	);
	if (prefixedCandidates.length === 0) return undefined;
	if (prefixedCandidates.length === 1) return prefixedCandidates[0];

	const preferred = prefixedCandidates.find((candidate) =>
		candidate.toLowerCase().endsWith(":epci")
	);
	return preferred ?? prefixedCandidates[0];
}

async function resolveUnknownTypeNames(
	geoservice: Geoservice,
	requestedTypeName: string
): Promise<string | undefined> {
	try {
		const capabilitiesUrl = buildWfsGetCapabilitiesUrl(geoservice);
		const response = await fetch(capabilitiesUrl.toString());
		if (!response.ok) return undefined;

		const payload = await response.text();
		const candidates = parseWfsFeatureTypeNamesFromCapabilities(payload);
		return selectFallbackTypeNames(requestedTypeName, candidates);
	} catch {
		return undefined;
	}
}

function isLikelyJsonPayload(payload: string): boolean {
	const trimmed = payload.trim();
	return trimmed.startsWith("{") || trimmed.startsWith("[");
}

function getWfsExceptionMessage(payload: string): string | undefined {
	const trimmed = payload.trim();
	if (!trimmed.startsWith("<")) return undefined;

	try {
		const document = new DOMParser().parseFromString(trimmed, "application/xml");
		const parserError = document.querySelector("parsererror");
		if (parserError) return undefined;

		const exceptionNode =
			document.querySelector("ExceptionText") ||
			document.querySelector("ServiceException") ||
			document.querySelector("Exception");

		const message = exceptionNode?.textContent?.trim();
		return message || undefined;
	} catch {
		return undefined;
	}
}

function parseFeaturesFromPayload(
	payload: string,
	contentType: string | null,
	preferJson: boolean,
	requestCrs: string,
	projCode: string
): Feature<Geometry>[] {
	const lowerContentType = contentType?.toLowerCase() ?? "";
	const canParseJson =
		preferJson && (lowerContentType.includes("json") || isLikelyJsonPayload(payload));

	if (canParseJson) {
		const parsedJson = JSON.parse(payload);
		return new GeoJSON().readFeatures(parsedJson, {
			dataProjection: requestCrs,
			featureProjection: projCode,
		});
	}

	const format = new WFS({ gmlFormat: new GML3() });
	return format.readFeatures(payload, {
		dataProjection: requestCrs,
		featureProjection: projCode,
	}) as Feature<Geometry>[];
}

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
	const parsedLayerSpec = parseLayerSpec(geoservice.layers);
	const resolvedTypeNames = resolveInitialTypeNames(
		geoservice,
		parsedLayerSpec.typeNames
	);
	const hasFilters = hasFilterParams(geoservice, parsedLayerSpec.extraParams);

	const source = new VectorSource({
		strategy: hasFilters ? allLoadingStrategy : bbox,
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
			const variants = getWfsRequestVariants(!!isGeoJSON, hasFilters);
			const tryLoadWithTypeNames = async (
				typeNames: string
			): Promise<{ features?: Feature<Geometry>[]; error?: Error }> => {
				const seenUrls = new Set<string>();
				let lastError: Error | null = null;

				for (const variant of variants) {
					const url = buildWfsGetFeatureUrl(
						geoservice,
						typeNames,
						parsedLayerSpec.extraParams,
						requestCrs,
						requestExtent,
						!!isGeoJSON,
						variant
					);
					const urlString = url.toString();
					if (seenUrls.has(urlString)) continue;
					seenUrls.add(urlString);

					let response: Response;
					try {
						response = await fetch(urlString);
					} catch (fetchError) {
						lastError =
							fetchError instanceof Error
								? fetchError
								: new Error(String(fetchError));
						if (variant !== variants[variants.length - 1]) {
							console.warn(
								`[WFSLayer] Variant "${variant.name}" failed for "${typeNames}" (network), trying fallback:`,
								lastError.message
							);
						}
						continue;
					}

					const payload = await response.text();
					const exceptionMessage = getWfsExceptionMessage(payload);

					if (!response.ok) {
						lastError = new Error(
							`WFS ${response.status}: ${exceptionMessage ?? response.statusText}`
						);
						if (variant !== variants[variants.length - 1]) {
							console.warn(
								`[WFSLayer] Variant "${variant.name}" failed for "${typeNames}" (HTTP), trying fallback:`,
								lastError.message
							);
						}
						continue;
					}

					if (exceptionMessage) {
						lastError = new Error(`WFS Exception: ${exceptionMessage}`);
						if (variant !== variants[variants.length - 1]) {
							console.warn(
								`[WFSLayer] Variant "${variant.name}" failed for "${typeNames}" (service exception), trying fallback:`,
								exceptionMessage
							);
						}
						continue;
					}

					try {
						const features = parseFeaturesFromPayload(
							payload,
							response.headers.get("content-type"),
							variant.includeOutputFormat,
							requestCrs,
							projCode
						);
						return { features };
					} catch (parseError) {
						lastError =
							parseError instanceof Error
								? parseError
								: new Error(String(parseError));
						if (variant !== variants[variants.length - 1]) {
							console.warn(
								`[WFSLayer] Variant "${variant.name}" failed for "${typeNames}" (parse), trying fallback:`,
								lastError.message
							);
						}
					}
				}

				return { error: lastError ?? new Error("WFS request failed") };
			};

			let activeTypeNames = resolvedTypeNames;
			let attempt = await tryLoadWithTypeNames(activeTypeNames);

			if (!attempt.features && attempt.error) {
				const unknownTypeName = extractUnknownFeatureTypeName(attempt.error.message);
				if (unknownTypeName) {
					const fallbackTypeNames = await resolveUnknownTypeNames(
						geoservice,
						unknownTypeName
					);
					if (fallbackTypeNames && fallbackTypeNames !== activeTypeNames) {
						console.warn(
							`[WFSLayer] Resolved unknown feature type "${unknownTypeName}" to "${fallbackTypeNames}" for "${resolvedTypeNames}".`
						);
						activeTypeNames = fallbackTypeNames;
						attempt = await tryLoadWithTypeNames(activeTypeNames);
					}
				}
			}

			if (!attempt.features) {
				throw attempt.error ?? new Error("WFS request failed");
			}

			source.addFeatures(attempt.features);
			console.log(
				`[WFSLayer] Loaded ${attempt.features.length} features for "${activeTypeNames}"`
			);
			if (success) success(attempt.features);
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Unknown WFS loading error";
			console.error(
				`[WFSLayer] Failed to load features for "${resolvedTypeNames}": ${errorMessage}`
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
			name: `wfs:${resolvedTypeNames}`,
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
