export interface LatLon {
	lat: number;
	lon: number;
}

/**
 * Maps an OpenLayers geometry type to a generic i18n label key.
 */
export function getGeometryLabelKeyFromType(geometryType?: string): string {
	switch (geometryType) {
		case 'Point':
			return 'geometry.types.point';
		case 'LineString':
			return 'geometry.types.lineString';
		case 'Polygon':
			return 'geometry.types.polygon';
		case 'Circle':
			return 'geometry.types.circle';
		case 'MultiPoint':
			return 'geometry.types.multiPoint';
		case 'MultiLineString':
			return 'geometry.types.multiLineString';
		case 'MultiPolygon':
			return 'geometry.types.multiPolygon';
		default:
			return 'geometry.types.unknown';
	}
}

/**
 * Parses a WKT POINT geometry string and extracts coordinates
 * @param geometry - WKT format string like "POINT(lon lat)"
 * @returns Object with lat/lon or null if parsing fails
 */
export function parsePointGeometry(geometry: string): LatLon | null {
	const match = geometry.match(/POINT\s*\(\s*([\d.-]+)\s+([\d.-]+)\s*\)/i);
	if (match) {
		return {
			lon: parseFloat(match[1]),
			lat: parseFloat(match[2]),
		};
	}
	return null;
}
