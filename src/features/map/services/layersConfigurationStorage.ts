import { Storage } from '@ign/mobile-device';
import type { CommunityLayer } from '@ign/mobile-core';

import { storageKey } from '@/shared/constants/storage';
import { getCommunityLayerKey } from '@/shared/utils/layerKey';
import { clampNumber } from '@/shared/utils/number';
import {
  DEFAULT_GEOPORTAIL_LAYER_OPACITY,
  DEFAULT_GEOPORTAIL_LAYER_VISIBILITY,
  DEFAULT_LAYER_GROUP_VISIBILITY,
} from '@/shared/constants/map';
import type { LayerDisplayState } from '@/features/map/types/layerGroups';
import type { LayerGroupVisibility } from '@/features/map/types/layerGroups';
import {
  hasLayerStyleChoices,
  getSelectedLayerStyleId,
} from '@/features/map/utils/layerStyles';

import type {
  SignalementLayerKey,
  SignalementLayerOpacity,
  SignalementLayerState,
  SignalementLayerVisibility,
} from '@/features/map/constants/signalementLayers.constants';
import {
  DEFAULT_SIGNALEMENT_LAYER_OPACITY,
  DEFAULT_SIGNALEMENT_LAYER_VISIBILITY,
  normalizeSignalementLayerOrder,
} from '@/features/map/constants/signalementLayers.constants';

const LAYERS_CONFIGURATION_STORAGE_KEY = 'LAYERS_CONFIGURATION';

interface PersistedLayerState {
  visible?: boolean;
  opacity?: number;
  locked?: boolean;
  styleId?: string;
}

export interface LayersConfiguration {
  layersByKey: Record<string, PersistedLayerState>;
  layerOrder: string[];
  groupVisibility: LayerGroupVisibility;
  geoportailLayerState: LayerDisplayState;
  signalementLayerState: SignalementLayerState;
}

export interface SaveLayersConfigurationParams {
  communityId: number;
  userId?: number | null;
  layers: CommunityLayer[];
  lockedByLayerKey: Record<string, boolean>;
  groupVisibility: LayerGroupVisibility;
  geoportailLayerState: LayerDisplayState;
  signalementLayerState: SignalementLayerState;
}

function getDefaultLayerGroupVisibility(): LayerGroupVisibility {
  return { ...DEFAULT_LAYER_GROUP_VISIBILITY };
}

/**
 * Returns the storage key used for one community layer configuration entry.
 */
function getLayersConfigurationStorageKey(
  communityId: number,
  userId?: number | null
): string {
  const userStorageKeyPart = userId == null ? 'anonymous' : String(userId);
  return storageKey(
    `${LAYERS_CONFIGURATION_STORAGE_KEY}_${communityId}_${userStorageKeyPart}`
  );
}

/**
 * Normalize raw persisted layer states loaded from storage.
 */
function toLayerStateMap(value: unknown): Record<string, PersistedLayerState> {
  if (!value || typeof value !== 'object') return {};

  const source = value as Record<string, unknown>;
  const result: Record<string, PersistedLayerState> = {};

  for (const [layerKey, layerState] of Object.entries(source)) {
    if (!layerState || typeof layerState !== 'object') continue;

    const rawState = layerState as {
      visible?: unknown;
      opacity?: unknown;
      locked?: unknown;
      styleId?: unknown;
    };
    const nextState: PersistedLayerState = {};

    if (typeof rawState.visible === 'boolean') {
      nextState.visible = rawState.visible;
    }

    if (typeof rawState.opacity === 'number' && Number.isFinite(rawState.opacity)) {
      nextState.opacity = clampNumber(rawState.opacity, 0, 1);
    }

    if (typeof rawState.locked === 'boolean') {
      nextState.locked = rawState.locked;
    }

    if (typeof rawState.styleId === 'string' && rawState.styleId.length > 0) {
      nextState.styleId = rawState.styleId;
    }

    result[layerKey] = nextState;
  }

  return result;
}

/**
 * Normalize raw persisted layer order values loaded from storage.
 * @param value Unknown value read from storage.
 * @returns Safe ordered list of layer keys.
 */
function toLayerOrder(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const orderedLayerKeys: string[] = [];

  for (const rawLayerKey of value) {
    if (typeof rawLayerKey !== 'string' || rawLayerKey.length === 0) {
      continue;
    }

    if (orderedLayerKeys.includes(rawLayerKey)) {
      continue;
    }

    orderedLayerKeys.push(rawLayerKey);
  }

  return orderedLayerKeys;
}

function toBooleanRecord(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== 'object') return {};

  const source = value as Record<string, unknown>;
  const result: Record<string, boolean> = {};

  for (const [key, rawValue] of Object.entries(source)) {
    if (typeof rawValue === 'boolean') {
      result[key] = rawValue;
    }
  }

  return result;
}

function toOpacityRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object') return {};

  const source = value as Record<string, unknown>;
  const result: Record<string, number> = {};

  for (const [key, rawValue] of Object.entries(source)) {
    if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
      result[key] = clampNumber(rawValue, 0, 1);
    }
  }

  return result;
}

function toGeoportailLayerState(value: unknown): LayerDisplayState {
  const source = value as Partial<LayerDisplayState> | null | undefined;

  return {
    visibility: {
      ...DEFAULT_GEOPORTAIL_LAYER_VISIBILITY,
      ...toBooleanRecord(source?.visibility),
    },
    opacity: {
      ...DEFAULT_GEOPORTAIL_LAYER_OPACITY,
      ...toOpacityRecord(source?.opacity),
    },
  };
}

function toLayerGroupVisibility(value: unknown): LayerGroupVisibility {
  return {
    ...getDefaultLayerGroupVisibility(),
    ...toBooleanRecord(value),
  };
}

/**
 * Normalize raw signalement visibility values loaded from storage.
 * @param value Unknown value read from storage.
 * @returns Partial visibility map for signalement layers.
 */
function toSignalementVisibility(
  value: unknown
): Partial<SignalementLayerVisibility> {
  if (!value || typeof value !== 'object') return {};

  const source = value as Record<string, unknown>;
  const result: Partial<SignalementLayerVisibility> = {};

  for (const [key, rawValue] of Object.entries(source)) {
    if (typeof rawValue === 'boolean') {
      result[key as keyof SignalementLayerVisibility] = rawValue;
    }
  }

  return result;
}

/**
 * Normalize raw signalement opacity values loaded from storage.
 * @param value Unknown value read from storage.
 * @returns Partial opacity map for signalement layers.
 */
function toSignalementOpacity(
  value: unknown
): Partial<SignalementLayerOpacity> {
  if (!value || typeof value !== 'object') return {};

  const source = value as Record<string, unknown>;
  const result: Partial<SignalementLayerOpacity> = {};

  for (const [key, rawValue] of Object.entries(source)) {
    if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
      result[key as keyof SignalementLayerOpacity] = clampNumber(rawValue, 0, 1);
    }
  }

  return result;
}

/**
 * Normalize raw signalement layer order loaded from storage.
 * @param value Unknown value read from storage.
 * @returns Safe signalement layer order with fallback values.
 */
function toSignalementLayerOrder(value: unknown): SignalementLayerKey[] {
  return normalizeSignalementLayerOrder(value);
}

function toSignalementLayerState(value: unknown): SignalementLayerState {
  const source = value as Partial<SignalementLayerState> | null | undefined;

  return {
    visibility: {
      ...DEFAULT_SIGNALEMENT_LAYER_VISIBILITY,
      ...toSignalementVisibility(source?.visibility),
    },
    opacity: {
      ...DEFAULT_SIGNALEMENT_LAYER_OPACITY,
      ...toSignalementOpacity(source?.opacity),
    },
    order: toSignalementLayerOrder(source?.order),
  };
}

/**
 * Load one community layer configuration from storage.
 * @param communityId Active community identifier.
 * @returns Sanitized configuration or null when not found/unreadable.
 */
export async function loadLayersConfiguration(
  communityId: number,
  userId?: number | null
): Promise<LayersConfiguration | null> {
  try {
    const raw = await Storage.get(
      getLayersConfigurationStorageKey(communityId, userId),
      'object'
    );

    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const payload = raw as Partial<LayersConfiguration> & {
      signalementLayerVisibility?: unknown;
      signalementLayerOpacity?: unknown;
      signalementLayerOrder?: unknown;
    };
    const signalementLayerState = payload.signalementLayerState
      ? toSignalementLayerState(payload.signalementLayerState)
      : {
          visibility: {
            ...DEFAULT_SIGNALEMENT_LAYER_VISIBILITY,
            ...toSignalementVisibility(payload.signalementLayerVisibility),
          },
          opacity: {
            ...DEFAULT_SIGNALEMENT_LAYER_OPACITY,
            ...toSignalementOpacity(payload.signalementLayerOpacity),
          },
          order: toSignalementLayerOrder(payload.signalementLayerOrder),
        };

    return {
      layersByKey: toLayerStateMap(payload.layersByKey),
      layerOrder: toLayerOrder(payload.layerOrder),
      groupVisibility: toLayerGroupVisibility(payload.groupVisibility),
      geoportailLayerState: toGeoportailLayerState(payload.geoportailLayerState),
      signalementLayerState,
    };
  } catch (error) {
    console.error('[Layers][Config] Failed to load layers configuration', error);
    return null;
  }
}

/**
 * Save current layer visibility/opacity preferences for one community.
 * @param params Community id and current layer/signalement states to persist.
 * @returns Promise resolved when write is done.
 */
export async function saveLayersConfiguration({
  communityId,
  userId,
  layers,
  lockedByLayerKey,
  groupVisibility,
  geoportailLayerState,
  signalementLayerState,
}: SaveLayersConfigurationParams): Promise<void> {
  const layerOrder: string[] = [];
  const layersByKey: Record<string, PersistedLayerState> = {};

  for (const layer of layers) {
    const layerKey = getCommunityLayerKey(layer);
    const selectedStyleId = getSelectedLayerStyleId(layer);

    layerOrder.push(layerKey);
    layersByKey[layerKey] = {
      visible: layer.visible ?? true,
      opacity: clampNumber(layer.opacity ?? 1, 0, 1),
      locked: lockedByLayerKey[layerKey] === true,
      ...(hasLayerStyleChoices(layer) && selectedStyleId ? { styleId: selectedStyleId } : {}),
    };
  }

  const payload: LayersConfiguration = {
    layersByKey,
    layerOrder,
    groupVisibility,
    geoportailLayerState,
    signalementLayerState: {
      ...signalementLayerState,
      order: normalizeSignalementLayerOrder(signalementLayerState.order),
    },
  };

  try {
    await Storage.set(
      getLayersConfigurationStorageKey(communityId, userId),
      payload,
      'object'
    );
  } catch (error) {
    console.error('[Layers][Config] Failed to save layers configuration', error);
  }
}
