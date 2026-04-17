import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import type Draw from 'ol/interaction/Draw';
import type Select from 'ol/interaction/Select';
import type OlMap from 'ol/Map';
import { unByKey } from 'ol/Observable';

import {
  SketchManager,
  type CommunityLayer,
  type InteractionMode,
  type Table,
} from '@ign/mobile-core';

import type { MapToolbarItem } from '@/features/map/components/MapToolbar';
import {
  DEFAULT_DIRECT_CONTRIBUTION_MODE,
  DIRECT_CONTRIBUTION_TOOL_DEFINITIONS,
  getDirectContributionToolActionById,
} from '@/features/map/constants/directContributionSession.constants';
import type { DirectContributionFeatureCandidate } from '@/features/map/types/directContributionFeatureCandidate';
import { getDirectContributionFeatureCandidatesAtPixel } from '@/features/map/utils/directContributionFeatureCandidates';

import { serializeDirectContributionDocumentAttributes } from '@/infra/map/directContribution/directContributionDocuments';
import { DirectContributionLayerService } from '@/infra/map/directContribution/DirectContributionLayerService';

import { getCommunityLayerGeometryType } from '@/shared/utils/communityLayer';
import { getCommunityLayerKey } from '@/shared/utils/layerKey';

export type DirectContributionFeatureFormMode = 'create' | 'edit';

export interface DirectContributionFeatureFormState {
  feature: Feature<Geometry>;
  layer: CommunityLayer;
  table: Table;
  mode: DirectContributionFeatureFormMode;
}

export interface UseDirectContributionSessionOptions {
  map: OlMap | null;
  isMapReady: boolean;
  vectorLayers: CommunityLayer[];
}

export interface UseDirectContributionSessionReturn {
  isSessionActive: boolean;
  activeLayer: CommunityLayer | null;
  currentMode: Exclude<InteractionMode, null>;
  toolbarItems: MapToolbarItem[];
  toolbarStatusText?: string;
  featureFormState: DirectContributionFeatureFormState | null;
  featureCandidates: DirectContributionFeatureCandidate[];
  isFeatureChoiceOpen: boolean;
  startSession: (layerKey: string) => void;
  startFeatureEdition: (candidate: DirectContributionFeatureCandidate) => void;
  closeSession: () => void;
  triggerToolbarAction: (toolId: string) => void;
  saveFeatureAttributes: (attributes: Record<string, unknown>) => Promise<void>;
  cancelFeatureForm: () => void;
  closeFeatureForm: () => void;
  selectFeatureCandidate: (candidateKey: string) => void;
  closeFeatureChoice: () => void;
}

interface DrawInteractionHandlers {
  onDrawStart: () => void;
}

interface SketchManagerInternals {
  drawInteraction?: Draw | null;
  selectInteraction?: Select | null;
}

interface PendingFeatureEdition {
  layerKey: string;
  feature: Feature<Geometry>;
}

const DIRECT_CONTRIBUTION_SELECTION_HIT_TOLERANCE = 0;
// Keep the actual selection strict, but widen the object choice search a bit so overlapping nearby features are easier to disambiguate on touch screens.
const DIRECT_CONTRIBUTION_FEATURE_CHOICE_HIT_TOLERANCE = 16;

// Draw actions should only be enabled for the geometry type supported by the edited layer. Non-draw tools stay enabled.
function isCompatibleDrawAction(
  drawGeometryType: 'Point' | 'LineString' | 'Polygon' | undefined,
  geometryType: 'Point' | 'LineString' | 'Polygon' | null
): boolean {
  if (!drawGeometryType || !geometryType) {
    return true;
  }

  return drawGeometryType === geometryType;
}

function isFeatureChoiceMode(mode: Exclude<InteractionMode, null>): boolean {
  return mode === 'select' || mode === 'modify';
}

export function useDirectContributionSession({
  map,
  isMapReady,
  vectorLayers,
}: UseDirectContributionSessionOptions): UseDirectContributionSessionReturn {
  const { t } = useTranslation();
  const [activeLayerKey, setActiveLayerKey] = useState<string | null>(null);
  const [currentMode, setCurrentMode] =
    useState<Exclude<InteractionMode, null>>(DEFAULT_DIRECT_CONTRIBUTION_MODE);
  const [selectedFeature, setSelectedFeature] =
    useState<Feature<Geometry> | null>(null);
  const [featureFormState, setFeatureFormState] =
    useState<DirectContributionFeatureFormState | null>(null);
  const [featureCandidates, setFeatureCandidates] = useState<
    DirectContributionFeatureCandidate[]
  >([]);
  const [isFeatureChoiceOpen, setIsFeatureChoiceOpen] = useState(false);

  const sketchManagerRef = useRef<SketchManager | null>(null);
  const currentModeRef = useRef<Exclude<InteractionMode, null>>(
    DEFAULT_DIRECT_CONTRIBUTION_MODE
  );
  const drawInteractionRef = useRef<Draw | null>(null);
  const drawHandlersRef = useRef<DrawInteractionHandlers | null>(null);
  const createdFeaturesRef = useRef(new WeakSet<Feature<Geometry>>());
  const pendingFeatureEditionRef = useRef<PendingFeatureEdition | null>(null);

  const activeLayer = useMemo(() => {
    if (!activeLayerKey) {
      return null;
    }

    return (
      vectorLayers.find((layer) => getCommunityLayerKey(layer) === activeLayerKey) ??
      null
    );
  }, [activeLayerKey, vectorLayers]);

  const activeGeometryType = useMemo(
    () => getCommunityLayerGeometryType(activeLayer),
    [activeLayer]
  );

  const layerService = useMemo(() => {
    if (!isMapReady || !map) {
      return null;
    }

    return new DirectContributionLayerService(map);
  }, [isMapReady, map]);

  const activeCollabLayer = useMemo(() => {
    if (!activeLayerKey || !layerService) {
      return null;
    }

    return layerService.getCollabLayer(activeLayerKey) ?? null;
  }, [activeLayerKey, layerService]);

  const activeCollabSource = useMemo(() => {
    if (!activeLayerKey || !layerService) {
      return null;
    }

    return layerService.getCollabSource(activeLayerKey) ?? null;
  }, [activeLayerKey, layerService]);

  const unbindDrawInteractionListeners = useCallback(() => {
    const drawInteraction = drawInteractionRef.current;
    const handlers = drawHandlersRef.current;

    if (drawInteraction && handlers) {
      drawInteraction.un('drawstart', handlers.onDrawStart);
    }

    drawInteractionRef.current = null;
    drawHandlersRef.current = null;
  }, []);

  const closeFeatureForm = useCallback(() => {
    setFeatureFormState(null);
  }, []);

  const closeFeatureChoice = useCallback(() => {
    setFeatureCandidates([]);
    setIsFeatureChoiceOpen(false);
  }, []);

  const openFeatureForm = useCallback(
    (feature: Feature<Geometry>, mode: DirectContributionFeatureFormMode) => {
      if (!activeLayer?.table) {
        return;
      }

      setFeatureFormState({
        feature,
        layer: activeLayer,
        table: activeLayer.table,
        mode,
      });
    },
    [activeLayer]
  );

  const clearRemovedFeatureState = useCallback((feature: Feature<Geometry>) => {
    setFeatureFormState((currentFormState) =>
      currentFormState?.feature === feature ? null : currentFormState
    );
    setSelectedFeature((currentSelected) =>
      currentSelected === feature ? null : currentSelected
    );
    setFeatureCandidates((currentCandidates) =>
      currentCandidates.filter((candidate) => candidate.feature !== feature)
    );
  }, []);

  const syncSelectedFeature = useCallback((feature: Feature<Geometry> | null) => {
    const sketchManager =
      sketchManagerRef.current as unknown as SketchManagerInternals | null;
    const selectedFeatures = sketchManager?.selectInteraction?.getFeatures();

    if (selectedFeatures) {
      selectedFeatures.clear();

      if (feature) {
        selectedFeatures.push(feature);
      }
    } else if (!feature) {
      sketchManagerRef.current?.clearSelection();
    }

    setSelectedFeature(feature);
  }, []);

  const bindDrawInteractionListeners = useCallback(() => {
    const sketchManager =
      sketchManagerRef.current as unknown as SketchManagerInternals | null;
    const drawInteraction = sketchManager?.drawInteraction ?? null;

    if (drawInteractionRef.current === drawInteraction) {
      return;
    }

    unbindDrawInteractionListeners();

    if (!drawInteraction?.on) {
      return;
    }

    const handlers: DrawInteractionHandlers = {
      onDrawStart: () => {
        setSelectedFeature(null);
      },
    };

    drawInteraction.on('drawstart', handlers.onDrawStart);

    drawInteractionRef.current = drawInteraction;
    drawHandlersRef.current = handlers;
  }, [unbindDrawInteractionListeners]);

  const destroySession = useCallback(() => {
    sketchManagerRef.current?.destroy();
    sketchManagerRef.current = null;
    createdFeaturesRef.current = new WeakSet<Feature<Geometry>>();
    pendingFeatureEditionRef.current = null;
    unbindDrawInteractionListeners();
    setCurrentMode(DEFAULT_DIRECT_CONTRIBUTION_MODE);
    currentModeRef.current = DEFAULT_DIRECT_CONTRIBUTION_MODE;
    setSelectedFeature(null);
    setFeatureFormState(null);
    closeFeatureChoice();
  }, [closeFeatureChoice, unbindDrawInteractionListeners]);

  useEffect(() => {
    if (
      !activeLayerKey ||
      !activeLayer ||
      !activeCollabLayer ||
      !activeCollabSource
    ) {
      return;
    }

    const sketchManager = new SketchManager({
      map: map as OlMap,
      source: activeCollabSource,
      autoBindUI: false,
      layerFilter: (layer) => layer === activeCollabLayer,
      modifyInteractionScope: 'selection',
      selectionHitTolerance: DIRECT_CONTRIBUTION_SELECTION_HIT_TOLERANCE,
      useSourceSelectionFallback: true,
      callbacks: {
        onModeChange: (nextMode) => {
          if (!nextMode) {
            return;
          }

          currentModeRef.current = nextMode;
          setCurrentMode(nextMode);
        },
        onFeatureAdded: (feature) => {
          createdFeaturesRef.current.add(feature);
          closeFeatureChoice();
          syncSelectedFeature(feature);
          openFeatureForm(feature, 'create');
          window.requestAnimationFrame(() => {
            sketchManagerRef.current?.setMode(DEFAULT_DIRECT_CONTRIBUTION_MODE);
            bindDrawInteractionListeners();
          });
        },
        onFeatureSelected: (feature) => {
          setSelectedFeature(feature);

          if (!feature) {
            return;
          }

          if (currentModeRef.current !== 'select') {
            return;
          }

          const mode: DirectContributionFeatureFormMode =
            createdFeaturesRef.current.has(feature) ? 'create' : 'edit';
          openFeatureForm(feature, mode);
        },
        onFeatureDeleted: (feature) => {
          clearRemovedFeatureState(feature);
        },
      },
    });

    sketchManagerRef.current = sketchManager;
    sketchManager.setActive(true);
    sketchManager.setMode(DEFAULT_DIRECT_CONTRIBUTION_MODE);
    bindDrawInteractionListeners();

    const pendingFeatureEdition = pendingFeatureEditionRef.current;
    if (pendingFeatureEdition?.layerKey === activeLayerKey) {
      window.requestAnimationFrame(() => {
        closeFeatureChoice();
        syncSelectedFeature(pendingFeatureEdition.feature);
        openFeatureForm(pendingFeatureEdition.feature, 'edit');
      });
      pendingFeatureEditionRef.current = null;
    }

    const sourceListenerKeys = [
      activeCollabSource.on('removefeature', (event) => {
        const removedFeature = event.feature as Feature<Geometry> | undefined;
        if (!removedFeature) {
          return;
        }

        clearRemovedFeatureState(removedFeature);
      }),
    ];

    return () => {
      unByKey(sourceListenerKeys);
      if (sketchManagerRef.current === sketchManager) {
        destroySession();
      }
    };
  }, [
    activeLayer,
    activeLayerKey,
    activeCollabLayer,
    activeCollabSource,
    bindDrawInteractionListeners,
    clearRemovedFeatureState,
    closeFeatureChoice,
    destroySession,
    map,
    openFeatureForm,
    syncSelectedFeature,
  ]);

  useEffect(() => {
    const activeTable = activeLayer?.table;
    if (!map || !activeCollabLayer || !activeCollabSource || !activeTable) {
      return;
    }

    const handleMapSingleClick = (event: { pixel: number[] }) => {
      if (!isFeatureChoiceMode(currentModeRef.current)) {
        return;
      }

      const candidates = getDirectContributionFeatureCandidatesAtPixel({
        map,
        pixel: event.pixel,
        layer: activeCollabLayer,
        source: activeCollabSource,
        communityLayer: activeLayer,
        table: activeTable,
        hitTolerance: DIRECT_CONTRIBUTION_FEATURE_CHOICE_HIT_TOLERANCE,
        fallbackLabel: t('layers.directContribution.objectChoice.defaultObjectName'),
      });

      if (candidates.length <= 1) {
        return;
      }

      sketchManagerRef.current?.clearSelection();
      closeFeatureForm();
      setFeatureCandidates(candidates);
      setIsFeatureChoiceOpen(true);
    };

    map.on('singleclick', handleMapSingleClick);

    return () => {
      map.un('singleclick', handleMapSingleClick);
    };
  }, [activeCollabLayer, activeCollabSource, activeLayer, closeFeatureForm, map, t]);

  const startSession = useCallback(
    (layerKey: string) => {
      pendingFeatureEditionRef.current = null;
      setActiveLayerKey(layerKey);
    },
    []
  );

  const startFeatureEdition = useCallback(
    (candidate: DirectContributionFeatureCandidate) => {
      pendingFeatureEditionRef.current = {
        layerKey: getCommunityLayerKey(candidate.layer),
        feature: candidate.feature,
      };
      setActiveLayerKey(getCommunityLayerKey(candidate.layer));
    },
    []
  );

  const closeSession = useCallback(() => {
    setActiveLayerKey(null);
    destroySession();
  }, [destroySession]);

  const triggerToolbarAction = useCallback(
    (toolId: string) => {
      if (toolId === 'close') {
        closeSession();
        return;
      }

      const action = getDirectContributionToolActionById(toolId);
      if (!action) {
        return;
      }

      sketchManagerRef.current?.triggerAction(action);
      bindDrawInteractionListeners();

      if (action !== 'select') {
        closeFeatureChoice();
      }

      if (action !== 'select' && action !== 'modify') {
        closeFeatureForm();
      }
    },
    [bindDrawInteractionListeners, closeFeatureChoice, closeFeatureForm, closeSession]
  );

  const saveFeatureAttributes = useCallback(
    async (attributes: Record<string, unknown>) => {
      const formState = featureFormState;
      if (!formState) {
        return;
      }

      const normalizedAttributes =
        await serializeDirectContributionDocumentAttributes(attributes);

      for (const [name, value] of Object.entries(normalizedAttributes)) {
        formState.feature.set(name, value);
      }

      createdFeaturesRef.current.delete(formState.feature);
      setFeatureFormState(null);
    },
    [featureFormState]
  );

  const cancelFeatureForm = useCallback(() => {
    const formState = featureFormState;
    if (!formState) {
      return;
    }

    if (formState.mode === 'create') {
      const layerKey = getCommunityLayerKey(formState.layer);
      layerService?.getCollabSource(layerKey)?.removeFeature(formState.feature);
      createdFeaturesRef.current.delete(formState.feature);
      sketchManagerRef.current?.clearSelection();
      setSelectedFeature(null);
    }

    setFeatureFormState(null);
  }, [featureFormState, layerService]);

  const selectFeatureCandidate = useCallback(
    (candidateKey: string) => {
      const candidate = featureCandidates.find(
        (currentCandidate) => currentCandidate.key === candidateKey
      )!;

      closeFeatureChoice();
      syncSelectedFeature(candidate.feature);

      if (currentModeRef.current === 'select') {
        const mode: DirectContributionFeatureFormMode =
          createdFeaturesRef.current.has(candidate.feature) ? 'create' : 'edit';
        openFeatureForm(candidate.feature, mode);
      }
    },
    [closeFeatureChoice, featureCandidates, openFeatureForm, syncSelectedFeature]
  );

  const toolbarItems = useMemo<MapToolbarItem[]>(() => {
    return DIRECT_CONTRIBUTION_TOOL_DEFINITIONS.map((definition) => ({
      id: definition.id,
      Icon: definition.icon,
      label: t(definition.labelKey),
      active: definition.activeMode === currentMode,
      disabled:
        !isCompatibleDrawAction(
          definition.drawGeometryType,
          activeGeometryType
        ) || (definition.id === 'delete' && !selectedFeature),
    }));
  }, [activeGeometryType, currentMode, selectedFeature, t]);

  const toolbarStatusText = activeLayer
    ? t('layers.directContribution.toolbarStatus', { layerTitle: activeLayer.title })
    : undefined;

  const isSessionActive = Boolean(
    activeLayer && activeLayerKey && activeCollabLayer
  );

  return {
    isSessionActive,
    activeLayer,
    currentMode,
    toolbarItems,
    toolbarStatusText,
    featureFormState,
    featureCandidates,
    isFeatureChoiceOpen,
    startSession,
    startFeatureEdition,
    closeSession,
    triggerToolbarAction,
    saveFeatureAttributes,
    cancelFeatureForm,
    closeFeatureForm,
    selectFeatureCandidate,
    closeFeatureChoice,
  };
}
