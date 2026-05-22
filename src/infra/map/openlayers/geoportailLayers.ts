import LayerGroup from 'ol/layer/Group';
import ol_layer_Geoportail from 'ol-ext/layer/Geoportail';
import {
  DEFAULT_GEOPORTAIL_LAYERS,
  GEOPORTAIL_API_KEY,
  GEOPORTAIL_LAYER_TITLES,
} from '@/shared/constants/map';
import type { CommunityLayer } from '@ign/mobile-core';

export interface GeoportailLayerConfig {
  name: string
  visible?: boolean
  opacity?: number
  server?: string
  gppKey?: string
  format?: string
  minZoom?: number
  maxZoom?: number
  title?: string
}

interface GeoportailEndpointConfig {
  server: string;
  gppKey: string;
}

const GEOPORTAIL_PUBLIC_KEY = 'gpf';
const GEOPORTAIL_PRIVATE_SCAN_KEY = 'ign_scan_ws';
const GEOPORTAIL_PROXY_SERVER = 'https://wxs.ign.fr/proxy/';

interface GeoportailCapability {
  server?: string;
  key?: string;
  format?: string;
  minZoom?: number;
  maxZoom?: number;
}

// Type augmentation for missing static property in type definitions
const GeoportailClass = ol_layer_Geoportail as typeof ol_layer_Geoportail & {
  capabilities: Record<string, GeoportailCapability>
};

/**
 * Initialize Geoportail capabilities by loading them from the server.
 * This should be called once at app startup before creating layers.
 */
export async function initGeoportailCapabilities(): Promise<void> {
  // Use getCapabilities which returns a real Promise
  const capabilities = await ol_layer_Geoportail.getCapabilities('gpf'); // 'gpf' key loads public Geoplateforme layers
  Object.assign(GeoportailClass.capabilities, capabilities);
}

function getGeoportailEndpointConfig(url: string): GeoportailEndpointConfig {
  const serverUrl = url.split('?')[0];

  if (serverUrl.includes('data.geopf.fr/private')) {
    return {
      server: 'https://data.geopf.fr/private/wmts',
      gppKey: GEOPORTAIL_PRIVATE_SCAN_KEY,
    };
  }

  if (serverUrl.includes('data.geopf.fr')) {
    return {
      server: 'https://data.geopf.fr/wmts',
      gppKey: GEOPORTAIL_PUBLIC_KEY,
    };
  }

  return {
    server: GEOPORTAIL_PROXY_SERVER,
    gppKey: GEOPORTAIL_API_KEY,
  };
}

/**
 * Create a single Geoportail layer.
 */
export function createGeoportailLayer(config: GeoportailLayerConfig): ol_layer_Geoportail {
  const { name, visible = false, opacity = 1 } = config;
  const capability = GeoportailClass.capabilities[name];
  const server = config.server ?? capability?.server;
  const gppKey =
    config.gppKey ??
    capability?.key ??
    (server?.includes('data.geopf.fr/private') ? GEOPORTAIL_PRIVATE_SCAN_KEY : undefined);
  const format = config.format ?? capability?.format;
  const minZoom = config.minZoom ?? capability?.minZoom;
  const maxZoom = config.maxZoom ?? capability?.maxZoom;
  const layerOptions: ConstructorParameters<typeof ol_layer_Geoportail>[1] & {
    gppKey?: string;
    hidpi?: boolean;
  } = {
    hidpi: false,
    visible,
    opacity,
    gppKey,
  };
  const tileOptions: NonNullable<ConstructorParameters<typeof ol_layer_Geoportail>[2]> & {
    maxZoom?: number;
  } = {
    server,
    gppKey,
    format,
    minZoom,
    maxZoom,
  };

  const layer = new ol_layer_Geoportail(name, layerOptions, tileOptions);

  if (config.title) {
    layer.set('title', config.title);
  }
  layer.set('geoportailLayerName', name);
  return layer;
}

export function getGeoportailLayerTitle(layerName: string): string {
  return GEOPORTAIL_LAYER_TITLES[layerName] ?? layerName;
}

export function getOfflineGeoportailLayerOptions(): Array<{
  name: string;
  title: string;
}> {
  return DEFAULT_GEOPORTAIL_LAYERS.map((layerName) => ({
    name: layerName,
    title: getGeoportailLayerTitle(layerName),
  }));
}

/**
 * Create Geoportail layers from enriched community layer data using the WMTS endpoint configured by the API.
 */
export function createCommunityGeoportailLayers(
  layers: CommunityLayer[]
): ol_layer_Geoportail[] {
  const geoportailLayers: ol_layer_Geoportail[] = [];

  for (const layer of layers) {
    const geoservice = layer.geoservice;
    if (!geoservice?.layers) {
      continue;
    }

    const endpointConfig = getGeoportailEndpointConfig(geoservice.url);
    geoportailLayers.push(createGeoportailLayer({
      name: geoservice.layers,
      visible: layer.visible ?? false,
      opacity: layer.opacity ?? 1,
      server: endpointConfig.server,
      gppKey: endpointConfig.gppKey,
      format: geoservice.format,
      minZoom: geoservice.minZoom,
      maxZoom: geoservice.maxZoom,
      title: geoservice.title ?? layer.title,
    }));
  }

  return geoportailLayers;
}

export function createGeoportailLayerGroup(
  layerNames: readonly string[] = DEFAULT_GEOPORTAIL_LAYERS
): LayerGroup {
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
  });
}
