import { useCallback, useEffect, useRef, useState } from 'react';

import type { EventsKey } from 'ol/events';
import type Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import VectorLayer from 'ol/layer/Vector';
import type OlMap from 'ol/Map';
import { unByKey } from 'ol/Observable';
import VectorSource from 'ol/source/Vector';

import { SketchManager, type SketchAction } from '@ign/mobile-core';

import type { SketchMode } from '@/features/map/constants/sketchTools.constants';
import { getSketchDraw, undoDrawingStep } from '@/features/map/utils/sketchUndo';
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
  currentSketchMode: SketchMode;
  sketchFeatureCount: number;
  isDrawingInProgress: boolean;
  triggerSketchAction: (action: SketchAction) => void;
  finalizeCurrentDrawing: () => void;
  getSketchFeatures: () => Feature<Geometry>[];
}

export function useReportSketchSession({
  map,
  enabled,
}: UseReportSketchSessionOptions): UseReportSketchSessionReturn {
  const [currentSketchMode, setCurrentSketchMode] = useState<SketchMode>(DEFAULT_SKETCH_MODE);
  const [sketchFeatureCount, setSketchFeatureCount] = useState(0);
  const [isDrawingInProgress, setIsDrawingInProgress] = useState(false);

  const sketchManagerRef = useRef<SketchManager | null>(null);
  const latestFinishedSketchRef = useRef<Feature<Geometry> | null>(null);

  const triggerSketchAction = useCallback((action: SketchAction) => {
    const sketchManager = sketchManagerRef.current;
    if (!sketchManager) return;

    if (action === 'undo' && undoDrawingStep(sketchManager, latestFinishedSketchRef)) {
      return;
    }

    sketchManager.triggerAction(action);
  }, []);

  const finalizeCurrentDrawing = useCallback(() => {
    // Mobile users often tap "Ajouter le croquis" instead of double-tapping to end draw.
    // We explicitly finish the active OL draw interaction so the feature is committed.
    getSketchDraw(sketchManagerRef.current)?.finishDrawing();
  }, []);

  const getSketchFeatures = useCallback((): Feature<Geometry>[] => {
    return sketchManagerRef.current?.getFeatures().map((feature) => feature.clone()) ?? [];
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

    let drawListenerKeys: EventsKey[] = [];

    const sketchManager = new SketchManager({
      map,
      source: sketchSource,
      autoBindUI: false,
      callbacks: {
        onModeChange: (nextMode) => {
          // Every mode change replaces the Draw interaction.
          unByKey(drawListenerKeys);
          const draw = getSketchDraw(sketchManagerRef.current);
          drawListenerKeys = draw
            ? [
                draw.on('drawstart', () => setIsDrawingInProgress(true)),
                draw.on('drawend', () => setIsDrawingInProgress(false)),
                draw.on('drawabort', () => setIsDrawingInProgress(false)),
              ]
            : [];

          if (nextMode) {
            setCurrentSketchMode(nextMode);
          }
        },
        onFeatureAdded: (feature) => {
          latestFinishedSketchRef.current = feature;
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
    sketchManager.setMode(DEFAULT_SKETCH_MODE);

    const syncSketchFeatureCount = () => {
      setSketchFeatureCount(sketchSource.getFeatures().length);
    };

    const sourceListenerKeys = [
      sketchSource.on('addfeature', syncSketchFeatureCount),
      sketchSource.on('removefeature', syncSketchFeatureCount),
    ];

    syncSketchFeatureCount();

    return () => {
      unByKey(sourceListenerKeys);
      sketchManager.destroy();
      map.removeLayer(sketchLayer);
      sketchManagerRef.current = null;
      latestFinishedSketchRef.current = null;
      setCurrentSketchMode(DEFAULT_SKETCH_MODE);
      setSketchFeatureCount(0);
      setIsDrawingInProgress(false);
    };
  }, [enabled, map]);

  return {
    currentSketchMode,
    sketchFeatureCount,
    isDrawingInProgress,
    triggerSketchAction,
    finalizeCurrentDrawing,
    getSketchFeatures,
  };
}
