import { useEffect } from 'react';
import type { RefObject } from 'react';
import type Map from 'ol/Map';
import type { OfflineMode, OfflineRasterMap } from '@/domain/offline/models';
import { findLayerGroupByName } from '@/infra/map/openlayers/layerGroups';
import { createOfflineRasterLayer } from '@/infra/map/openlayers/offlineRasterLayers';

export function useOfflineRasterMapLayers(
  mapRef: RefObject<Map | null>,
  rasterMaps: OfflineRasterMap[],
  isMapReady: boolean,
  mode: OfflineMode
) {
  useEffect(() => {
    if (!isMapReady) {
      return;
    }

    const map = mapRef.current;
    if (!map) {
      return;
    }

    const cacheGroup = findLayerGroupByName(map, 'cache');
    if (!cacheGroup) {
      return;
    }

    const geoportailGroup = findLayerGroupByName(map, 'geoportailGroup');
    const loadedRasterMaps = rasterMaps.filter((rasterMap) => rasterMap.loaded);
    cacheGroup.getLayers().clear();

    for (const rasterMap of loadedRasterMaps) {
      cacheGroup.getLayers().push(createOfflineRasterLayer(rasterMap));
    }

    cacheGroup.setVisible(mode === 'offline' && loadedRasterMaps.length > 0);

    if (geoportailGroup) {
      geoportailGroup.setVisible(mode !== 'offline');
    }
  }, [isMapReady, mapRef, mode, rasterMaps]);
}
