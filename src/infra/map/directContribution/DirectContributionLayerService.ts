import {
  CollabVectorLayer,
  CollabVectorSource,
} from '@ign/mobile-core';
import type { CommunityLayer } from '@ign/mobile-core';
import type Map from 'ol/Map';
import type BaseLayer from 'ol/layer/Base';
import type LayerGroup from 'ol/layer/Group';
import { getCommunityLayerKey } from '@/shared/utils/layerKey';

const GUICHET_LAYER_GROUP_NAME = 'guichet';
const DIRECT_CONTRIBUTION_SOURCE_EVENT_TYPES = ['editchange', 'saveend'] as const;

export const COMMUNITY_LAYER_KEY_PROPERTY = 'communityLayerKey';

type ObservableCollabVectorSource = CollabVectorSource & {
  on(type: string, listener: (event: unknown) => void): void;
  un(type: string, listener: (event: unknown) => void): void;
};

function findLayerGroup(map: Map, name: string): LayerGroup | undefined {
  return map
    .getLayers()
    .getArray()
    .find((layer) => layer.get('name') === name) as LayerGroup | undefined;
}

function getLayerKeyFromOlLayer(layer: BaseLayer): string | undefined {
  const rawLayerKey = layer.get(COMMUNITY_LAYER_KEY_PROPERTY);
  return typeof rawLayerKey === 'string' && rawLayerKey.length > 0
    ? rawLayerKey
    : undefined;
}

/**
 * Stores the app layer key on the OpenLayers layer so direct contribution actions can resolve the matching collaborative source from the map.
 */
export function applyCommunityLayerMetadata(
  olLayer: BaseLayer,
  layer: CommunityLayer
): void {
  olLayer.set(COMMUNITY_LAYER_KEY_PROPERTY, getCommunityLayerKey(layer));
}

/**
 * Resolves direct contribution actions from a UI layer key to the underlying collaborative OpenLayers layer and source mounted on the map.
 */
export class DirectContributionLayerService {
  private readonly map: Map;

  constructor(map: Map) {
    this.map = map;
  }

  /**
   * Subscribes to collaborative draft events so the UI refreshes badges only when the local edit state actually changes.
   */
  public observeLayers(onChange: () => void): () => void {
    const cleanupTasks: Array<() => void> = [];

    for (const layer of this.listLayers()) {
      const source = layer.getSource() as ObservableCollabVectorSource | null;
      if (!source) {
        continue;
      }

      for (const eventType of DIRECT_CONTRIBUTION_SOURCE_EVENT_TYPES) {
        source.on(eventType, onChange);
        cleanupTasks.push(() => {
          source.un(eventType, onChange);
        });
      }
    }

    return () => {
      for (const cleanup of cleanupTasks) {
        cleanup();
      }
    };
  }

  /**
   * Returns the number of unsent local edits currently tracked by one collaborative source. Missing layers are treated as empty.
   */
  public getPendingChangesCount(layerKey: string): number {
    const source = this.getSource(layerKey);
    if (!source) {
      return 0;
    }

    return Math.max(0, source.getPendingChangesCount());
  }

  /**
   * Builds the badge state consumed by the layers panel for a whole set of collaborative layer keys.
   */
  public getPendingChangesCountByLayerKeys(
    layerKeys: string[]
  ): Record<string, number> {
    const countsByLayerKey: Record<string, number> = {};

    for (const layerKey of layerKeys) {
      countsByLayerKey[layerKey] = this.getPendingChangesCount(layerKey);
    }

    return countsByLayerKey;
  }

  /**
   * Exposes the live collaborative layer instance mounted on the map for one
   * community layer key.
   */
  public getCollabLayer(layerKey: string): CollabVectorLayer | undefined {
    return this.getLayer(layerKey);
  }

  /**
   * Exposes the live collaborative source mounted on the map for one community
   * layer key.
   */
  public getCollabSource(layerKey: string): CollabVectorSource | undefined {
    return this.getSource(layerKey);
  }

  /**
   * Discards one layer draft from the collaborative source.
   */
  public resetLayerChanges(layerKey: string): void {
    this.getSource(layerKey)?.resetChanges();
  }

  /**
   * Sends one layer draft to the collaborative backend.
   */
  public async submitLayerChanges(layerKey: string): Promise<unknown> {
    const source = this.getSource(layerKey);
    if (!source) {
      throw new Error(`No collaborative layer found for key "${layerKey}"`);
    }

    return source.submitChanges();
  }

  private listLayers(): CollabVectorLayer[] {
    const guichet = findLayerGroup(this.map, GUICHET_LAYER_GROUP_NAME);
    if (!guichet) {
      return [];
    }

    return guichet
      .getLayers()
      .getArray()
      .filter((layer): layer is CollabVectorLayer => layer instanceof CollabVectorLayer)
      .filter((layer) => typeof getLayerKeyFromOlLayer(layer) === 'string');
  }

  private getLayer(layerKey: string): CollabVectorLayer | undefined {
    return this.listLayers().find((layer) => getLayerKeyFromOlLayer(layer) === layerKey);
  }

  private getSource(layerKey: string): CollabVectorSource | undefined {
    return this.getLayer(layerKey)?.getSource() ?? undefined;
  }
}
