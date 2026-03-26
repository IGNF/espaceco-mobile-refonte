import type { CommunityLayer } from '@ign/mobile-core'
import type BaseLayer from 'ol/layer/Base'
import { getCommunityLayerKey } from '@/shared/utils/layerKey'

export const COMMUNITY_LAYER_KEY_PROPERTY = 'communityLayerKey'

/**
 * Stores the app layer key on the OpenLayers layer so map-side features can
 * resolve the matching community layer later on.
 */
export function applyCommunityLayerMetadata(
  olLayer: BaseLayer,
  layer: CommunityLayer
): void {
  olLayer.set(COMMUNITY_LAYER_KEY_PROPERTY, getCommunityLayerKey(layer))
}

/**
 * Reads the app layer key previously stored on an OpenLayers layer.
 */
export function getCommunityLayerKeyFromOlLayer(
  layer: BaseLayer
): string | undefined {
  const rawLayerKey = layer.get(COMMUNITY_LAYER_KEY_PROPERTY)

  return typeof rawLayerKey === 'string' && rawLayerKey.length > 0
    ? rawLayerKey
    : undefined
}
