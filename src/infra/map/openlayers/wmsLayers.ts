import type { CommunityLayer } from '@ign/mobile-core';
import TileLayer from 'ol/layer/Tile';
import TileWMS from 'ol/source/TileWMS';

import { applyCommunityLayerMetadata } from '@/infra/map/openlayers/layerMetadata';

export function createCommunityWmsLayers(layers: CommunityLayer[]): TileLayer<TileWMS>[] {
  const wmsLayers: TileLayer<TileWMS>[] = [];

  for (const layer of layers) {
    const geoservice = layer.geoservice;
    if (!geoservice || geoservice.type !== 'WMS' || !geoservice.layers || !geoservice.url) {
      continue;
    }
    const geoserviceOptions = geoservice as typeof geoservice & {
      map?: string;
    };
    const layerOptions = {
      visible: layer.visible ?? true,
      opacity: layer.opacity ?? 1,
      source: new TileWMS({
        url: geoservice.url,
        crossOrigin: 'anonymous',
        params: {
          LAYERS: geoservice.layers,
          ...(geoserviceOptions.map ? { MAP: geoserviceOptions.map } : {}),
        },
      }),
    };

    const olLayer = new TileLayer(layerOptions);

    olLayer.set('title', geoservice.title ?? layer.title);
    olLayer.set('name', geoservice.layers);
    applyCommunityLayerMetadata(olLayer, layer);
    wmsLayers.push(olLayer);
  }

  return wmsLayers;
}
