export const DEFAULT_MAP_CENTER_LON_LAT: [number, number] = [2.3522, 48.8566]
export const DEFAULT_MAP_ZOOM = 11
export const DEFAULT_MAP_FOCUS_ZOOM = 13
export const DEFAULT_MAP_SHOW_SCALELINE = true

/**
 * Geoportail layer identifiers
 * @see https://geoservices.ign.fr/services-web-experts
 */
export const GEOPORTAIL_LAYERS = {
	MAPS: 'GEOGRAPHICALGRIDSYSTEMS.MAPS',
	PLAN_IGN: 'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2',
	ORTHOPHOTOS: 'ORTHOIMAGERY.ORTHOPHOTOS',
} as const

export const DEFAULT_GEOPORTAIL_LAYERS = [
	GEOPORTAIL_LAYERS.PLAN_IGN,
	GEOPORTAIL_LAYERS.ORTHOPHOTOS,
	GEOPORTAIL_LAYERS.MAPS,
] as const

/**
 * Geoportail server configuration
 */
export const GEOPORTAIL_SERVER = 'https://data.geopf.fr/wmts'
