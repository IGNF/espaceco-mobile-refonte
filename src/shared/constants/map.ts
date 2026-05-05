export const GEOLOCATION_DOUBLE_TAP_DELAY_MS = 300;
export const GEOLOCATION_LOCK_RECENTER_INTERVAL_MS = 30000;
export const GEOLOCATION_LOCK_RECENTER_ANIMATION_DURATION_MS = 1000;

export const DEFAULT_MAP_CENTER_LON_LAT: [number, number] = [2.3522, 48.8566];
export const DEFAULT_MAP_ZOOM = 11;
export const DEFAULT_MAP_FOCUS_ZOOM = 13;
export const DEFAULT_MAP_FOCUS_ZOOM_ON_USER_LOCATION = 16;
export const DEFAULT_MAP_SEARCH_ZOOM = 16;
export const DEFAULT_MAP_SHOW_SCALELINE = true;

export const COMMUNITY_FEATURE_CONSULTATION_HIT_TOLERANCE = 16;

/**
 * Geoportail API key for public services
 * @see https://geoservices.ign.fr/services-web-experts
 */
export const GEOPORTAIL_API_KEY = 'essentiels';

/**
 * Geoportail layer identifiers
 * @see https://geoservices.ign.fr/services-web-experts
 */
export const GEOPORTAIL_LAYERS = {
	MAPS: 'GEOGRAPHICALGRIDSYSTEMS.MAPS',
	PLAN_IGN: 'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2',
	ORTHOPHOTOS: 'ORTHOIMAGERY.ORTHOPHOTOS',
} as const;

export const DEFAULT_GEOPORTAIL_LAYERS = [
	GEOPORTAIL_LAYERS.PLAN_IGN,
	GEOPORTAIL_LAYERS.ORTHOPHOTOS,
	GEOPORTAIL_LAYERS.MAPS,
] as const;

export const GEOPORTAIL_LAYER_TITLES: Record<string, string> = {
	[GEOPORTAIL_LAYERS.MAPS]: 'Cartes IGN',
	[GEOPORTAIL_LAYERS.PLAN_IGN]: 'Plan IGN',
	[GEOPORTAIL_LAYERS.ORTHOPHOTOS]: 'Photographies aériennes',
};

/**
 * Geoportail server configuration
 */
export const GEOPORTAIL_SERVER = 'https://data.geopf.fr/wmts';

/**
 * Layer metadata cache freshness duration (in ms).
 * Used to decide when community layers should be refreshed from API.
 */
export const LAYER_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Layer metadata cache key prefix
 */
export const LAYER_CACHE_KEY_PREFIX = 'community-layers:';

/**
 * Maximum duration for initial app/map loading before showing an error toast.
 */
export const APP_LOADING_TIMEOUT_MS = 20 * 1000;
