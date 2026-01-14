import LayerGroup from 'ol/layer/Group'
import ol_layer_Geoportail from 'ol-ext/layer/Geoportail'
import {
	DEFAULT_GEOPORTAIL_LAYERS,
	GEOPORTAIL_SERVER,
} from '@/shared/constants/map'

export interface GeoportailLayerConfig {
	name: string
	visible?: boolean
	opacity?: number
}

// Type augmentation for missing static property in type definitions
const GeoportailClass = ol_layer_Geoportail as typeof ol_layer_Geoportail & {
	capabilities: Record<string, unknown>
}

/**
 * Initialize Geoportail capabilities by loading them from the server.
 * This should be called once at app startup before creating layers.
 */
export async function initGeoportailCapabilities(): Promise<void> {
	// Use getCapabilities which returns a real Promise
	// 'gpf' key loads public Geoplateforme layers
	const capabilities = await ol_layer_Geoportail.getCapabilities('gpf')
	// Store capabilities in the static property for layer creation
	Object.assign(GeoportailClass.capabilities, capabilities)
}

/**
 * Create a single Geoportail layer.
 */
function createGeoportailLayer(config: GeoportailLayerConfig): ol_layer_Geoportail {
	const { name, visible = false, opacity = 1 } = config

	return new ol_layer_Geoportail(name, {
		visible,
		opacity,
	}, {
		server: GEOPORTAIL_SERVER,
	})
}

/**
 * Create the main Geoportail layer group with default layers.
 * The first layer in the list will be visible by default.
 */
export function createGeoportailLayerGroup(
	layerNames: readonly string[] = DEFAULT_GEOPORTAIL_LAYERS
): LayerGroup {
	const layers = layerNames.map((name, index) =>
		createGeoportailLayer({
			name,
			visible: index === 0,
			opacity: 1,
		})
	)

	return new LayerGroup({
		properties: {
			title: 'Géoservices',
			name: 'geoportailGroup',
			openInLayerSwitcher: false,
		},
		layers,
	})
}
