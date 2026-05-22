import type BaseLayer from 'ol/layer/Base';
import type { OfflineRasterMap } from '@/domain/offline/models';
import { cacheStorage } from '@/infra/storage/cacheStorage';
import { OFFLINE_EMPTY_TILE_DATA_URL } from '@/shared/constants/offline';
import { createGeoportailLayer } from '@/infra/map/openlayers/geoportailLayers';

/**
 * Build the storage key of one cached raster tile.
 *
 * The download service saves each WMTS tile blob with this key, and the
 * offline Geoportail layer rebuilds the same key later to read that tile
 * back from local cache instead of doing a network request.
 */
export function getOfflineRasterTileKey(rasterMapId: string, tileCoord: number[]): string {
  return `raster/${rasterMapId}/${tileCoord[0]}/${tileCoord[1]}/${tileCoord[2]}`;
}

/**
 * Resolve one raster tile from local cache and assign it to the OL tile image.
 */
function loadOfflineRasterTile(image: HTMLImageElement, key: string): void {
  void cacheStorage.getTile(key).then((blob) => {
    // A tile can be missing when the map asks outside downloaded extents or zoom levels.
    if (!blob) {
      image.src = OFFLINE_EMPTY_TILE_DATA_URL;
      return;
    }

    const objectUrl = URL.createObjectURL(blob);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      image.src = OFFLINE_EMPTY_TILE_DATA_URL;
    };
    image.src = objectUrl;
  });
}

/**
 * Create a Geoportail layer whose tile loader reads only the locally cached raster tiles of the offline map.
 */
export function createOfflineRasterLayer(rasterMap: OfflineRasterMap): BaseLayer {
  const layer = createGeoportailLayer({
    name: rasterMap.layerName,
    visible: rasterMap.visible,
    opacity: 1,
  });

  layer.set('title', rasterMap.name);
  layer.set('name', `offline-raster-${rasterMap.id}`);
  layer.set('offlineRasterMapId', rasterMap.id);

  const source = layer.getSource() as unknown as {
    setTileLoadFunction(
      tileLoadFunction: (
        tile: {
          getImage(): HTMLImageElement;
          getTileCoord(): number[];
        },
        src: string
      ) => void
    ): void;
  };

  source.setTileLoadFunction((tile) => {
    loadOfflineRasterTile(
      tile.getImage(),
      getOfflineRasterTileKey(rasterMap.id, tile.getTileCoord())
    );
  });

  return layer;
}
