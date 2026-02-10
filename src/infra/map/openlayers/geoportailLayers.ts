import LayerGroup from 'ol/layer/Group'
import ol_layer_Geoportail from 'ol-ext/layer/Geoportail'
import {
  DEFAULT_GEOPORTAIL_LAYERS,
  GEOPORTAIL_SERVER,
} from '@/shared/constants/map'
import type { CommunityLayer } from '@/domain/community/models'

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
  const capabilities = await ol_layer_Geoportail.getCapabilities('gpf'); // 'gpf' key loads public Geoplateforme layers
  Object.assign(GeoportailClass.capabilities, capabilities);
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
 * Check if a layer name exists in the loaded Geoportail capabilities.
 */
function hasCapability(layerName: string): boolean {
  return layerName in GeoportailClass.capabilities;
}

/**
 * Create Geoportail layers from enriched community layer data.
 * Only creates layers whose names exist in the loaded capabilities.
 */
export function createCommunityGeoportailLayers(
  layers: CommunityLayer[]
): ol_layer_Geoportail[] {
  console.log('createCommunityGeoportailLayers', layers);
  return layers
    .filter((layer) => {
      console.log('layer', layer);
      const name = layer.geoservice?.layers;
      if (!name) return false;
      if (!hasCapability(name)) {
        console.warn(`Skipping layer "${name}": not found in Geoportail capabilities`);
        return false;
      }
      return true;
    })
    .map((layer) => {
      const visibility = (layer as CommunityLayer & { visibility?: boolean }).visibility
      console.log('createGeoportailLayer', layer);
      return createGeoportailLayer({
        name: layer.geoservice?.layers ?? '',
        visible: layer.visible ?? visibility ?? false,
        opacity: layer.opacity ?? 1,
      });
    })
}

export function createGeoportailLayerGroup(
  layerNames: readonly string[] = DEFAULT_GEOPORTAIL_LAYERS
): LayerGroup {
  console.log('createGeoportailLayerGroup', layerNames);
  const layers = layerNames.map((name, index) =>
    createGeoportailLayer({
      name,
      visible: index === 0,
      opacity: 1,
    })
  );

  return new LayerGroup({
    properties: {
      title: 'Géoservices',
      name: 'geoportailGroup',
      openInLayerSwitcher: false,
    },
    layers,
  })
}
