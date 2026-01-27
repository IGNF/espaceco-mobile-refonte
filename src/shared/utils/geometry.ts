export interface LatLon {
	lat: number;
	lon: number;
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
