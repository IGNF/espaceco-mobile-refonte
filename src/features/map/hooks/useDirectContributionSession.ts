import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { EventsKey } from 'ol/events';
import type Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import type Select from 'ol/interaction/Select';
import type OlMap from 'ol/Map';
import { unByKey } from 'ol/Observable';

import {
  SketchManager,
  type CommunityLayer,
  type Table,
} from '@ign/mobile-core';

import type { MapToolbarItem } from '@/features/map/components/MapToolbar';
import {
  DEFAULT_DIRECT_CONTRIBUTION_MODE,
  DIRECT_CONTRIBUTION_TOOL_LABEL_KEYS,
} from '@/features/map/constants/directContributionSession.constants';
import {
  getSketchToolAction,
  getSketchToolbarItems,
  type SketchMode,
} from '@/features/map/constants/sketchTools.constants';
import type { DirectContributionFeatureCandidate } from '@/features/map/types/directContributionFeatureCandidate';
import { getDirectContributionFeatureCandidatesAtPixel } from '@/features/map/utils/directContributionFeatureCandidates';
import { getSketchDraw, undoDrawingStep } from '@/features/map/utils/sketchUndo';

import { serializeDirectContributionDocumentAttributes } from '@/infra/map/directContribution/directContributionDocuments';
import { DirectContributionLayerService } from '@/infra/map/directContribution/DirectContributionLayerService';

import {
  getCommunityLayerGeometryType,
  getCommunityLayerTitle,
} from '@/shared/utils/communityLayer';
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
  selectFeatureCandidate: (candidateKey: string) => void;
  closeFeatureChoice: () => void;
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
  return !drawGeometryType || !geometryType || drawGeometryType === geometryType;
}

function isFeatureChoiceMode(mode: SketchMode): boolean {
  return mode === 'select' || mode === 'modify';
}

export function useDirectContributionSession({
  map,
  isMapReady,
  vectorLayers,
}: UseDirectContributionSessionOptions): UseDirectContributionSessionReturn {
  const { t } = useTranslation();
  const [activeLayerKey, setActiveLayerKey] = useState<string | null>(null);
  const [currentMode, setCurrentMode] = useState<SketchMode>(DEFAULT_DIRECT_CONTRIBUTION_MODE);
  const [selectedFeature, setSelectedFeature] =
    useState<Feature<Geometry> | null>(null);
  const [featureFormState, setFeatureFormState] =
    useState<DirectContributionFeatureFormState | null>(null);
  const [featureCandidates, setFeatureCandidates] = useState<
    DirectContributionFeatureCandidate[]
  >([]);
  const [isFeatureChoiceOpen, setIsFeatureChoiceOpen] = useState(false);

  const sketchManagerRef = useRef<SketchManager | null>(null);
  const currentModeRef = useRef<SketchMode>(DEFAULT_DIRECT_CONTRIBUTION_MODE);
  const createdFeaturesRef = useRef(new WeakSet<Feature<Geometry>>());
  const pendingFeatureEditionRef = useRef<PendingFeatureEdition | null>(null);
  const latestFinishedSketchRef = useRef<Feature<Geometry> | null>(null);

  const activeLayer = useMemo(() => {
    if (!activeLayerKey) {
      return null;
    }

    return (
      vectorLayers.find((layer) => getCommunityLayerKey(layer) === activeLayerKey) ??
      null
    );
  }, [activeLayerKey, vectorLayers]);

  // A layer object is recreated whenever its opacity, visibility or style changes.
  // The session must survive that, so its effects read the layer through this ref.
  const activeLayerRef = useRef(activeLayer);
  useEffect(() => {
    activeLayerRef.current = activeLayer;
  }, [activeLayer]);
  const hasActiveLayer = activeLayer !== null;

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

  const activeCollabSource = activeCollabLayer?.getSource() ?? null;

  const closeFeatureForm = useCallback(() => {
    setFeatureFormState(null);
  }, []);

  const closeFeatureChoice = useCallback(() => {
    setFeatureCandidates([]);
    setIsFeatureChoiceOpen(false);
  }, []);

  const openFeatureForm = useCallback((feature: Feature<Geometry>) => {
    const layer = activeLayerRef.current;
    if (!layer?.table) {
      return;
    }

    setFeatureFormState({
      feature,
      layer,
      table: layer.table,
      mode: createdFeaturesRef.current.has(feature) ? 'create' : 'edit',
    });
  }, []);

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

  const syncSelectedFeature = useCallback((feature: Feature<Geometry>) => {
    // clearSelection() would notify onFeatureSelected, which opens the form in select mode.
    const selectedFeatures = (
      sketchManagerRef.current as unknown as { selectInteraction: Select } | null
    )?.selectInteraction.getFeatures();

    selectedFeatures?.clear();
    selectedFeatures?.push(feature);
    setSelectedFeature(feature);
  }, []);

  useEffect(() => {
    if (!map || !hasActiveLayer || !activeCollabLayer || !activeCollabSource) {
      return;
    }

    let drawListenerKeys: EventsKey[] = [];

    const sketchManager = new SketchManager({
      map,
      source: activeCollabSource,
      autoBindUI: false,
      layerFilter: (layer) => layer === activeCollabLayer,
      modifyInteractionScope: 'selection',
      selectionHitTolerance: DIRECT_CONTRIBUTION_SELECTION_HIT_TOLERANCE,
      useSourceSelectionFallback: true,
      callbacks: {
        onModeChange: (nextMode) => {
          // Every mode change replaces the Draw interaction.
          unByKey(drawListenerKeys);
          const draw = getSketchDraw(sketchManagerRef.current);
          drawListenerKeys = draw
            ? [draw.on('drawstart', () => setSelectedFeature(null))]
            : [];

          if (nextMode) {
            currentModeRef.current = nextMode;
            setCurrentMode(nextMode);
          }
        },
        onFeatureAdded: (feature) => {
          latestFinishedSketchRef.current = feature;
          createdFeaturesRef.current.add(feature);
          closeFeatureChoice();
          syncSelectedFeature(feature);
          openFeatureForm(feature);
          window.requestAnimationFrame(() => {
            sketchManagerRef.current?.setMode(DEFAULT_DIRECT_CONTRIBUTION_MODE);
          });
        },
        onFeatureSelected: (feature) => {
          setSelectedFeature(feature);

          if (feature && currentModeRef.current === 'select') {
            openFeatureForm(feature);
          }
        },
        onFeatureModified: () => {
          latestFinishedSketchRef.current = null;
        },
        onFeatureDeleted: () => {
          latestFinishedSketchRef.current = null;
        },
      },
    });

    sketchManagerRef.current = sketchManager;
    sketchManager.setMode(DEFAULT_DIRECT_CONTRIBUTION_MODE);

    const pendingFeatureEdition = pendingFeatureEditionRef.current;
    if (pendingFeatureEdition?.layerKey === activeLayerKey) {
      window.requestAnimationFrame(() => {
        closeFeatureChoice();
        syncSelectedFeature(pendingFeatureEdition.feature);
        openFeatureForm(pendingFeatureEdition.feature);
      });
      pendingFeatureEditionRef.current = null;
    }

    const removeFeatureListenerKey = activeCollabSource.on('removefeature', (event) => {
      if (event.feature) {
        clearRemovedFeatureState(event.feature as Feature<Geometry>);
      }
    });

    return () => {
      unByKey(removeFeatureListenerKey);
      sketchManager.destroy();
      sketchManagerRef.current = null;
      createdFeaturesRef.current = new WeakSet<Feature<Geometry>>();
      latestFinishedSketchRef.current = null;
      setCurrentMode(DEFAULT_DIRECT_CONTRIBUTION_MODE);
      currentModeRef.current = DEFAULT_DIRECT_CONTRIBUTION_MODE;
      setSelectedFeature(null);
      setFeatureFormState(null);
      closeFeatureChoice();
    };
  }, [
    activeCollabLayer,
    activeCollabSource,
    activeLayerKey,
    clearRemovedFeatureState,
    closeFeatureChoice,
    hasActiveLayer,
    map,
    openFeatureForm,
    syncSelectedFeature,
  ]);

  useEffect(() => {
    if (!map || !activeCollabLayer || !activeCollabSource) {
      return;
    }

    const handleMapSingleClick = (event: { pixel: number[] }) => {
      const communityLayer = activeLayerRef.current;
      if (!communityLayer?.table || !isFeatureChoiceMode(currentModeRef.current)) {
        return;
      }

      const candidates = getDirectContributionFeatureCandidatesAtPixel({
        map,
        pixel: event.pixel,
        layer: activeCollabLayer,
        source: activeCollabSource,
        communityLayer,
        table: communityLayer.table,
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
  }, [activeCollabLayer, activeCollabSource, closeFeatureForm, map, t]);

  useEffect(() => {
    const sketchManager = sketchManagerRef.current;
    if (!sketchManager || !featureFormState) return;

    sketchManager.setActive(false);

    return () => {
      if (sketchManagerRef.current !== sketchManager) return;
      sketchManager.setMode(currentModeRef.current);
    };
  }, [featureFormState]);

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
    pendingFeatureEditionRef.current = null;
    setActiveLayerKey(null);
  }, []);

  const triggerToolbarAction = useCallback(
    (toolId: string) => {
      if (toolId === 'close') {
        closeSession();
        return;
      }

      const action = getSketchToolAction(toolId);
      const sketchManager = sketchManagerRef.current;
      if (!action || !sketchManager) {
        return;
      }

      if (action === 'undo' && undoDrawingStep(sketchManager, latestFinishedSketchRef)) {
        return;
      }

      sketchManager.triggerAction(action);

      if (action !== 'select') {
        closeFeatureChoice();
      }

      if (action !== 'select' && action !== 'modify') {
        closeFeatureForm();
      }
    },
    [closeFeatureChoice, closeFeatureForm, closeSession]
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
      activeCollabSource?.removeFeature(formState.feature);
      createdFeaturesRef.current.delete(formState.feature);
      sketchManagerRef.current?.clearSelection();
    }

    setFeatureFormState(null);
  }, [activeCollabSource, featureFormState]);

  const selectFeatureCandidate = useCallback(
    (candidateKey: string) => {
      const candidate = featureCandidates.find(
        (currentCandidate) => currentCandidate.key === candidateKey
      )!;

      closeFeatureChoice();
      syncSelectedFeature(candidate.feature);

      if (currentModeRef.current === 'select') {
        openFeatureForm(candidate.feature);
      }
    },
    [closeFeatureChoice, featureCandidates, openFeatureForm, syncSelectedFeature]
  );

  const toolbarItems = useMemo<MapToolbarItem[]>(
    () =>
      getSketchToolbarItems(
        DIRECT_CONTRIBUTION_TOOL_LABEL_KEYS,
        currentMode,
        t,
        (tool) =>
          !isCompatibleDrawAction(tool.drawGeometryType, activeGeometryType) ||
          (tool.id === 'delete' && !selectedFeature)
      ),
    [activeGeometryType, currentMode, selectedFeature, t]
  );

  const layerTitle = activeLayer ? getCommunityLayerTitle(activeLayer) : '';
  const toolbarStatusText = layerTitle
    ? t('layers.directContribution.toolbarStatus', { layerTitle })
    : undefined;

  const isSessionActive = Boolean(activeLayer && activeCollabLayer);

  return {
    isSessionActive,
    activeLayer,
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
    selectFeatureCandidate,
    closeFeatureChoice,
  };
}
