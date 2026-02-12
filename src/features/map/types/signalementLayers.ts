export const SIGNAL_LAYER_KEYS = {
  mesSignalements: 'signalements:mes-signalements',
  croquis: 'signalements:croquis',
  signalements: 'signalements:signalements',
} as const;

export type SignalementLayerKey =
  (typeof SIGNAL_LAYER_KEYS)[keyof typeof SIGNAL_LAYER_KEYS];

export type SignalementLayerVisibility = Record<SignalementLayerKey, boolean>;

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
