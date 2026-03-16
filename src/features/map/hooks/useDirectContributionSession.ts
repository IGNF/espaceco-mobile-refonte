import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SketchManager, type CommunityLayer, type InteractionMode, type Table } from '@ign/mobile-core';
import type Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import type Draw from 'ol/interaction/Draw';
import type OlMap from 'ol/Map';
import { unByKey } from 'ol/Observable';
import { useTranslation } from 'react-i18next';
import type { MapToolbarItem } from '@/features/map/components/MapToolbar';
import {
  DEFAULT_DIRECT_CONTRIBUTION_MODE,
  DIRECT_CONTRIBUTION_TOOL_DEFINITIONS,
  getDirectContributionToolActionById,
} from '@/features/map/constants/directContributionSession.constants';
import { serializeDirectContributionDocumentAttributes } from '@/infra/map/directContribution/directContributionDocuments';
import { DirectContributionLayerService } from '@/infra/map/directContribution/DirectContributionLayerService';
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
  startSession: (layerKey: string) => void;
  closeSession: () => void;
  triggerToolbarAction: (toolId: string) => void;
  saveFeatureAttributes: (attributes: Record<string, unknown>) => Promise<void>;
  cancelFeatureForm: () => void;
  closeFeatureForm: () => void;
}

interface DrawInteractionHandlers {
  onDrawStart: () => void;
}

interface SketchManagerInternals {
  drawInteraction?: Draw | null;
}

function getGeometryTypeFromTable(layer: CommunityLayer | null): 'Point' | 'LineString' | 'Polygon' | null {
  const table = layer?.table;
  if (!table) {
    return null;
  }

  const geometryColumn = table.columns[table.geometryName] as { type?: unknown } | undefined;
  const rawType = typeof geometryColumn?.type === 'string' ? geometryColumn.type : '';

  if (/point/i.test(rawType)) {
    return 'Point';
  }
  if (/line/i.test(rawType)) {
    return 'LineString';
  }
  if (/polygon/i.test(rawType)) {
    return 'Polygon';
  }

  return null;
}

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

export function useDirectContributionSession({
  map,
  isMapReady,
  vectorLayers,
}: UseDirectContributionSessionOptions): UseDirectContributionSessionReturn {
  const { t } = useTranslation();
  const [activeLayerKey, setActiveLayerKey] = useState<string | null>(null);
  const [currentMode, setCurrentMode] =
    useState<Exclude<InteractionMode, null>>(DEFAULT_DIRECT_CONTRIBUTION_MODE);
  const [selectedFeature, setSelectedFeature] = useState<Feature<Geometry> | null>(null);
  const [featureFormState, setFeatureFormState] = useState<DirectContributionFeatureFormState | null>(null);

  const sketchManagerRef = useRef<SketchManager | null>(null);
  const currentModeRef = useRef<Exclude<InteractionMode, null>>(DEFAULT_DIRECT_CONTRIBUTION_MODE);
  const drawInteractionRef = useRef<Draw | null>(null);
  const drawHandlersRef = useRef<DrawInteractionHandlers | null>(null);
  const createdFeaturesRef = useRef(new WeakSet<Feature<Geometry>>());

  const activeLayer = useMemo(() => {
    if (!activeLayerKey) {
      return null;
    }

    return vectorLayers.find((layer) => getCommunityLayerKey(layer) === activeLayerKey) ?? null;
  }, [activeLayerKey, vectorLayers]);

  const activeGeometryType = useMemo(
    () => getGeometryTypeFromTable(activeLayer),
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

  const openFeatureForm = useCallback((
    feature: Feature<Geometry>,
    mode: DirectContributionFeatureFormMode
  ) => {
    if (!activeLayer?.table) {
      return;
    }

    setFeatureFormState({
      feature,
      layer: activeLayer,
      table: activeLayer.table,
      mode,
    });
  }, [activeLayer]);

  const clearRemovedFeatureState = useCallback((feature: Feature<Geometry>) => {
    setFeatureFormState((currentFormState) =>
      currentFormState?.feature === feature ? null : currentFormState
    );
    setSelectedFeature((currentSelected) =>
      currentSelected === feature ? null : currentSelected
    );
  }, []);

  const bindDrawInteractionListeners = useCallback(() => {
    const sketchManager = sketchManagerRef.current as unknown as SketchManagerInternals | null;
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
    unbindDrawInteractionListeners();
    setCurrentMode(DEFAULT_DIRECT_CONTRIBUTION_MODE);
    currentModeRef.current = DEFAULT_DIRECT_CONTRIBUTION_MODE;
    setSelectedFeature(null);
    setFeatureFormState(null);
  }, [unbindDrawInteractionListeners]);

  useEffect(() => {
    if (!activeLayerKey || !activeLayer || !activeCollabLayer || !activeCollabSource) {
      return;
    }

    const sketchManager = new SketchManager({
      map: map as OlMap,
      source: activeCollabSource,
      autoBindUI: false,
      layerFilter: (layer) => layer === activeCollabLayer,
      modifyInteractionScope: 'selection',
      selectionHitTolerance: 10,
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
          setSelectedFeature(feature);
          openFeatureForm(feature, 'create');
          window.requestAnimationFrame(() => {
            sketchManagerRef.current?.setMode(DEFAULT_DIRECT_CONTRIBUTION_MODE);
            bindDrawInteractionListeners();
          });
        },
        onFeatureSelected: (feature) => {
          setSelectedFeature(feature);

          if (!feature || currentModeRef.current !== 'select') {
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
    destroySession,
    map,
    openFeatureForm,
  ]);

  const startSession = useCallback((layerKey: string) => {
    const collabLayer = layerService?.getCollabLayer(layerKey) ?? null;
    const collabSource = layerService?.getCollabSource(layerKey) ?? null;

    if (!collabLayer || !collabSource) {
      return;
    }

    setActiveLayerKey(layerKey);
  }, [layerService]);

  const closeSession = useCallback(() => {
    setActiveLayerKey(null);
    destroySession();
  }, [destroySession]);

  const triggerToolbarAction = useCallback((toolId: string) => {
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

    if (action !== 'select' && action !== 'modify') {
      closeFeatureForm();
    }
  }, [bindDrawInteractionListeners, closeFeatureForm, closeSession]);

  const saveFeatureAttributes = useCallback(async (attributes: Record<string, unknown>) => {
    const formState = featureFormState;
    if (!formState) {
      return;
    }

    const normalizedAttributes = await serializeDirectContributionDocumentAttributes(attributes);

    for (const [name, value] of Object.entries(normalizedAttributes)) {
      formState.feature.set(name, value);
    }

    createdFeaturesRef.current.delete(formState.feature);
    setFeatureFormState(null);
  }, [featureFormState]);

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

  const toolbarItems = useMemo<MapToolbarItem[]>(() => {
    return DIRECT_CONTRIBUTION_TOOL_DEFINITIONS.map((definition) => ({
      id: definition.id,
      Icon: definition.icon,
      label: t(definition.labelKey),
      active: definition.activeMode === currentMode,
      disabled:
        !isCompatibleDrawAction(definition.drawGeometryType, activeGeometryType) ||
        (definition.id === 'delete' && !selectedFeature),
    }));
  }, [activeGeometryType, currentMode, selectedFeature, t]);

  const toolbarStatusText = activeLayer
    ? t('layers.directContribution.toolbarStatus', { layerTitle: activeLayer.title })
    : undefined;

  const isSessionActive = Boolean(
    activeLayer &&
    activeLayerKey &&
    activeCollabLayer
  );

  return {
    isSessionActive,
    activeLayer,
    currentMode,
    toolbarItems,
    toolbarStatusText,
    featureFormState,
    startSession,
    closeSession,
    triggerToolbarAction,
    saveFeatureAttributes,
    cancelFeatureForm,
    closeFeatureForm,
  };
}
