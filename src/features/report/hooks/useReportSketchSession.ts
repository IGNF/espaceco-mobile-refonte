import { useCallback, useEffect, useRef, useState } from 'react';
import type Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import type Draw from 'ol/interaction/Draw';
import VectorLayer from 'ol/layer/Vector';
import type OlMap from 'ol/Map';
import { unByKey } from 'ol/Observable';
import VectorSource from 'ol/source/Vector';
import { SketchManager, type InteractionMode, type SketchAction } from '@ign/mobile-core';
import {
  DEFAULT_SKETCH_MODE,
  SKETCH_LAYER_NAME,
  SKETCH_LAYER_TITLE,
  SKETCH_STYLE,
} from '@/features/report/constants/reportSketch.constants';

export interface UseReportSketchSessionOptions {
  map?: OlMap | null;
  enabled: boolean;
}

export interface UseReportSketchSessionReturn {
  currentSketchMode: Exclude<InteractionMode, null>;
  sketchFeatureCount: number;
  isDrawingInProgress: boolean;
  triggerSketchAction: (action: SketchAction) => void;
  finalizeCurrentDrawing: () => void;
  getSketchFeatures: () => Feature<Geometry>[];
  clearSession: () => void;
}

interface SketchManagerInternals {
  drawInteraction?: Draw | null;
}

interface DrawInteractionHandlers {
  onDrawStart: () => void;
  onDrawEnd: () => void;
}

function isDrawAction(action: SketchAction): boolean {
  return action === 'drawPoint' ||
    action === 'drawLine' ||
    action === 'drawPolygon' ||
    action === 'drawCircle';
}

export function useReportSketchSession({
  map,
  enabled,
}: UseReportSketchSessionOptions): UseReportSketchSessionReturn {
  const [currentSketchMode, setCurrentSketchMode] = useState<Exclude<InteractionMode, null>>(DEFAULT_SKETCH_MODE);
  const [sketchFeatureCount, setSketchFeatureCount] = useState(0);
  const [isDrawingInProgress, setIsDrawingInProgress] = useState(false);

  const sketchManagerRef = useRef<SketchManager | null>(null);
  const sketchLayerRef = useRef<VectorLayer<VectorSource<Feature<Geometry>>> | null>(null);
  const sketchSourceRef = useRef<VectorSource<Feature<Geometry>> | null>(null);
  const drawInteractionRef = useRef<Draw | null>(null);
  const drawHandlersRef = useRef<DrawInteractionHandlers | null>(null);

  const unbindDrawInteractionListeners = useCallback(() => {
    // Draw interaction is recreated when switching draw modes.
    // Always detach previous listeners to avoid duplicate callbacks and leaks.
    const drawInteraction = drawInteractionRef.current;
    const handlers = drawHandlersRef.current;

    if (drawInteraction && handlers) {
      drawInteraction.un('drawstart', handlers.onDrawStart);
      drawInteraction.un('drawend', handlers.onDrawEnd);
      drawInteraction.un('drawabort', handlers.onDrawEnd);
    }

    drawInteractionRef.current = null;
    drawHandlersRef.current = null;
  }, []);

  const bindDrawInteractionListeners = useCallback(() => {
    // SketchManager keeps the active OL Draw interaction internally.
    // We read it here to monitor real "draw in progress" state from drawstart/drawend events.
    const sketchManager = sketchManagerRef.current as unknown as SketchManagerInternals | null;
    const drawInteraction = sketchManager?.drawInteraction ?? null;

    // No-op if we are already bound to the current interaction instance.
    if (drawInteractionRef.current === drawInteraction) {
      return;
    }

    unbindDrawInteractionListeners();

    if (!drawInteraction?.on) {
      return;
    }

    const handlers: DrawInteractionHandlers = {
      onDrawStart: () => {
        setIsDrawingInProgress(true);
      },
      onDrawEnd: () => {
        setIsDrawingInProgress(false);
      },
    };

    drawInteraction.on('drawstart', handlers.onDrawStart);
    drawInteraction.on('drawend', handlers.onDrawEnd);
    drawInteraction.on('drawabort', handlers.onDrawEnd);

    drawInteractionRef.current = drawInteraction;
    drawHandlersRef.current = handlers;
  }, [unbindDrawInteractionListeners]);

  const clearSession = useCallback(() => {
    const sketchManager = sketchManagerRef.current;
    if (sketchManager) {
      sketchManager.destroy();
      sketchManagerRef.current = null;
    }

    if (map && sketchLayerRef.current && map.getLayers().getArray().includes(sketchLayerRef.current)) {
      map.removeLayer(sketchLayerRef.current);
    }

    sketchLayerRef.current = null;
    sketchSourceRef.current = null;
    unbindDrawInteractionListeners();
    setCurrentSketchMode(DEFAULT_SKETCH_MODE);
    setSketchFeatureCount(0);
    setIsDrawingInProgress(false);
  }, [map, unbindDrawInteractionListeners]);

  const triggerSketchAction = useCallback((action: SketchAction) => {
    sketchManagerRef.current?.triggerAction(action);
    // Mode changes can replace the Draw interaction instance, so rebind after each action.
    bindDrawInteractionListeners();

    if (!isDrawAction(action)) {
      // In modify/select/delete/undo modes we never have an active drawing gesture.
      setIsDrawingInProgress(false);
    }
  }, [bindDrawInteractionListeners]);

  const finalizeCurrentDrawing = useCallback(() => {
    // Mobile users often tap "Ajouter le croquis" instead of double-tapping to end draw.
    // We explicitly finish the active OL draw interaction so the feature is committed.
    const sketchManager = sketchManagerRef.current as unknown as SketchManagerInternals | null;

    sketchManager?.drawInteraction?.finishDrawing?.();
  }, []);

  const getSketchFeatures = useCallback((): Feature<Geometry>[] => {
    const sketchSource = sketchSourceRef.current;
    if (!sketchSource) return [];

    return sketchSource.getFeatures().map((feature) => feature.clone());
  }, []);

  useEffect(() => {
    if (!enabled || !map) return;

    const sketchSource = new VectorSource<Feature<Geometry>>();
    const sketchLayer = new VectorLayer({
      source: sketchSource,
      style: SKETCH_STYLE,
      properties: {
        name: SKETCH_LAYER_NAME,
        title: SKETCH_LAYER_TITLE,
      },
      zIndex: Infinity,
    });

    map.addLayer(sketchLayer);

    const sketchManager = new SketchManager({
      map,
      source: sketchSource,
      autoBindUI: false,
      callbacks: {
        onModeChange: (nextMode) => {
          if (!nextMode) return;
          setCurrentSketchMode(nextMode);
        },
      },
    });

    sketchManagerRef.current = sketchManager;
    sketchLayerRef.current = sketchLayer;
    sketchSourceRef.current = sketchSource;

    sketchManager.setActive(true);
    sketchManager.setMode(DEFAULT_SKETCH_MODE);
    // Default mode creates the initial Draw interaction; bind listeners once it exists.
    bindDrawInteractionListeners();

    const syncSketchFeatureCount = () => {
      setSketchFeatureCount(sketchSource.getFeatures().length);
    };

    const sourceListenerKeys = [
      sketchSource.on('addfeature', syncSketchFeatureCount),
      sketchSource.on('removefeature', syncSketchFeatureCount),
      sketchSource.on('clear', syncSketchFeatureCount),
    ];

    syncSketchFeatureCount();

    return () => {
      unByKey(sourceListenerKeys);

      if (sketchManagerRef.current === sketchManager) {
        sketchManager.destroy();
        sketchManagerRef.current = null;
      }

      if (sketchLayerRef.current === sketchLayer) {
        if (map.getLayers().getArray().includes(sketchLayer)) {
          map.removeLayer(sketchLayer);
        }
        sketchLayerRef.current = null;
      }
      if (sketchSourceRef.current === sketchSource) {
        sketchSourceRef.current = null;
      }
      unbindDrawInteractionListeners();

      setCurrentSketchMode(DEFAULT_SKETCH_MODE);
      setSketchFeatureCount(0);
      setIsDrawingInProgress(false);
    };
  }, [bindDrawInteractionListeners, enabled, map, unbindDrawInteractionListeners]);

  return {
    currentSketchMode,
    sketchFeatureCount,
    isDrawingInProgress,
    triggerSketchAction,
    finalizeCurrentDrawing,
    getSketchFeatures,
    clearSession,
  };
}
