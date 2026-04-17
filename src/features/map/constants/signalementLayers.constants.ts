export const SIGNAL_LAYER_KEYS = {
  mesSignalements: 'signalements:mes-signalements',
  croquis: 'signalements:croquis',
  signalements: 'signalements:signalements',
} as const;

export type SignalementLayerKey =
  (typeof SIGNAL_LAYER_KEYS)[keyof typeof SIGNAL_LAYER_KEYS];

export type SignalementLayerVisibility = Record<SignalementLayerKey, boolean>;
export type SignalementLayerOpacity = Record<SignalementLayerKey, number>;
const SIGNAL_LAYER_KEY_SET = new Set<SignalementLayerKey>(
  Object.values(SIGNAL_LAYER_KEYS)
);

export interface SignalementLayerDefinition {
  key: SignalementLayerKey;
  titleKey: string;
}

export const SIGNALEMENT_LAYER_DEFINITIONS: SignalementLayerDefinition[] = [
  {
    key: SIGNAL_LAYER_KEYS.mesSignalements,
    titleKey: 'layers.defaults.mesSignalements',
  },
  {
    key: SIGNAL_LAYER_KEYS.croquis,
    titleKey: 'layers.defaults.croquis',
  },
  {
    key: SIGNAL_LAYER_KEYS.signalements,
    titleKey: 'layers.defaults.signalements',
  },
];

export const DEFAULT_SIGNALEMENT_LAYER_VISIBILITY: SignalementLayerVisibility = {
  [SIGNAL_LAYER_KEYS.mesSignalements]: true,
  [SIGNAL_LAYER_KEYS.croquis]: true,
  [SIGNAL_LAYER_KEYS.signalements]: true,
};

export const DEFAULT_SIGNALEMENT_LAYER_ORDER: SignalementLayerKey[] =
  SIGNALEMENT_LAYER_DEFINITIONS.map((layerDefinition) => layerDefinition.key);

export function isSignalementLayerKey(value: unknown): value is SignalementLayerKey {
  return typeof value === 'string' && SIGNAL_LAYER_KEY_SET.has(value as SignalementLayerKey);
}

export const DEFAULT_SIGNALEMENT_LAYER_OPACITY: SignalementLayerOpacity = {
  [SIGNAL_LAYER_KEYS.mesSignalements]: 1,
  [SIGNAL_LAYER_KEYS.croquis]: 1,
  [SIGNAL_LAYER_KEYS.signalements]: 1,
};

export const SIGNAL_GROUP_NAME = 'signalementGroup';
export const LAYER_NAME_MES_SIGNALEMENTS = 'MesSignalements';
export const LAYER_NAME_CROQUIS = 'Croquis';
export const LAYER_NAME_SIGNALEMENTS = 'Signalements';
export const LAYER_NAME_BY_SIGNALEMENT_KEY: Record<SignalementLayerKey, string> = {
  [SIGNAL_LAYER_KEYS.mesSignalements]: LAYER_NAME_MES_SIGNALEMENTS,
  [SIGNAL_LAYER_KEYS.croquis]: LAYER_NAME_CROQUIS,
  [SIGNAL_LAYER_KEYS.signalements]: LAYER_NAME_SIGNALEMENTS,
};

export function normalizeSignalementLayerOrder(
  value: unknown
): SignalementLayerKey[] {
  if (!Array.isArray(value)) {
    return [...DEFAULT_SIGNALEMENT_LAYER_ORDER];
  }

  const normalizedOrder: SignalementLayerKey[] = [];

  for (const rawLayerKey of value) {
    if (
      !isSignalementLayerKey(rawLayerKey) ||
      normalizedOrder.includes(rawLayerKey)
    ) {
      continue;
    }

    normalizedOrder.push(rawLayerKey);
  }

  for (const layerKey of DEFAULT_SIGNALEMENT_LAYER_ORDER) {
    if (!normalizedOrder.includes(layerKey)) {
      normalizedOrder.push(layerKey);
    }
  }

  return normalizedOrder;
}
