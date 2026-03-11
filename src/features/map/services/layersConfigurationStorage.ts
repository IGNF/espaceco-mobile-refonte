import { Storage } from '@ign/mobile-device';
import type { CommunityLayer } from '@ign/mobile-core';
import { storageKey } from '@/shared/constants/storage';
import { getCommunityLayerKey } from '@/shared/utils/layerKey';
import { clampNumber } from '@/shared/utils/number';
import type {
  SignalementLayerKey,
  SignalementLayerOpacity,
  SignalementLayerVisibility,
} from '@/features/map/types/signalementLayers';
import { normalizeSignalementLayerOrder } from '@/features/map/types/signalementLayers';

const LAYERS_CONFIGURATION_STORAGE_KEY = 'LAYERS_CONFIGURATION';

interface PersistedLayerState {
  visible?: boolean;
  opacity?: number;
  locked?: boolean;
}

export interface LayersConfiguration {
  layersByKey: Record<string, PersistedLayerState>;
  layerOrder: string[];
  signalementLayerVisibility: Partial<SignalementLayerVisibility>;
  signalementLayerOpacity: Partial<SignalementLayerOpacity>;
  signalementLayerOrder: SignalementLayerKey[];
}

export interface SaveLayersConfigurationParams {
  communityId: number;
  userId?: number | null;
  layers: CommunityLayer[];
  lockedByLayerKey: Record<string, boolean>;
  signalementLayerVisibility: SignalementLayerVisibility;
  signalementLayerOpacity: SignalementLayerOpacity;
  signalementLayerOrder: SignalementLayerKey[];
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

    const payload = raw as Partial<LayersConfiguration>;

    return {
      layersByKey: toLayerStateMap(payload.layersByKey),
      layerOrder: toLayerOrder(payload.layerOrder),
      signalementLayerVisibility: toSignalementVisibility(
        payload.signalementLayerVisibility
      ),
      signalementLayerOpacity: toSignalementOpacity(payload.signalementLayerOpacity),
      signalementLayerOrder: toSignalementLayerOrder(payload.signalementLayerOrder),
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
  signalementLayerVisibility,
  signalementLayerOpacity,
  signalementLayerOrder,
}: SaveLayersConfigurationParams): Promise<void> {
  const layerOrder: string[] = [];
  const layersByKey: Record<string, PersistedLayerState> = {};

  for (const layer of layers) {
    const layerKey = getCommunityLayerKey(layer);
    layerOrder.push(layerKey);
    layersByKey[layerKey] = {
      visible: layer.visible ?? true,
      opacity: clampNumber(layer.opacity ?? 1, 0, 1),
      locked: lockedByLayerKey[layerKey] === true,
    };
  }

  const payload: LayersConfiguration = {
    layersByKey,
    layerOrder,
    signalementLayerVisibility,
    signalementLayerOpacity,
    signalementLayerOrder: normalizeSignalementLayerOrder(signalementLayerOrder),
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
