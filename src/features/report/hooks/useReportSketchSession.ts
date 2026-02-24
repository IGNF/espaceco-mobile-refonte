import { useCallback, useEffect, useRef, useState } from 'react';
import type Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
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
  triggerSketchAction: (action: SketchAction) => void;
  getSketchFeatures: () => Feature<Geometry>[];
  clearSession: () => void;
}

export function useReportSketchSession({
  map,
  enabled,
}: UseReportSketchSessionOptions): UseReportSketchSessionReturn {
  const [currentSketchMode, setCurrentSketchMode] = useState<Exclude<InteractionMode, null>>(DEFAULT_SKETCH_MODE);
  const [sketchFeatureCount, setSketchFeatureCount] = useState(0);

  const sketchManagerRef = useRef<SketchManager | null>(null);
  const sketchLayerRef = useRef<VectorLayer<VectorSource<Feature<Geometry>>> | null>(null);
  const sketchSourceRef = useRef<VectorSource<Feature<Geometry>> | null>(null);

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
    setCurrentSketchMode(DEFAULT_SKETCH_MODE);
    setSketchFeatureCount(0);
  }, [map]);

  const triggerSketchAction = useCallback((action: SketchAction) => {
    sketchManagerRef.current?.triggerAction(action);
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

      setCurrentSketchMode(DEFAULT_SKETCH_MODE);
      setSketchFeatureCount(0);
    };
  }, [enabled, map]);

  return {
    currentSketchMode,
    sketchFeatureCount,
    triggerSketchAction,
    getSketchFeatures,
    clearSession,
  };
}
