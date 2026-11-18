import { useCallback, useRef, useState } from 'react';

import type { EventsKey } from 'ol/events';
import type Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import { unByKey } from 'ol/Observable';
import type { ProjectionLike } from 'ol/proj';

import { formatSketchMeasure } from '@/features/map/utils/measureGeometry';

/**
 * Length or area of the latest sketch, shown under the sketch toolbar.
 * OpenLayers adds the drawn feature itself to the source at drawend, so following that feature
 * shows the drawing in progress, then the finished sketch and its later edits, until the next drawing starts.
 */
export function useSketchMeasure() {
  const [sketchMeasure, setSketchMeasure] = useState<string | null>(null);
  const measuredFeatureRef = useRef<Feature<Geometry> | null>(null);
  const changeListenerKeyRef = useRef<EventsKey | null>(null);

  const clearSketchMeasure = useCallback(() => {
    if (changeListenerKeyRef.current) {
      unByKey(changeListenerKeyRef.current);
    }
    changeListenerKeyRef.current = null;
    measuredFeatureRef.current = null;
    setSketchMeasure(null);
  }, []);

  const followSketchMeasure = useCallback((feature: Feature<Geometry>, projection: ProjectionLike) => {
    clearSketchMeasure();

    const updateMeasure = () => {
      setSketchMeasure(formatSketchMeasure(feature.getGeometry()!, projection));
    };

    // The feature is listened to rather than its geometry, because SketchManager undoes a modification with setGeometry.
    changeListenerKeyRef.current = feature.on('change', updateMeasure);
    measuredFeatureRef.current = feature;
    updateMeasure();
  }, [clearSketchMeasure]);

  const clearRemovedSketchMeasure = useCallback((feature: Feature<Geometry>) => {
    if (feature === measuredFeatureRef.current) {
      clearSketchMeasure();
    }
  }, [clearSketchMeasure]);

  return {
    sketchMeasure,
    followSketchMeasure,
    clearSketchMeasure,
    clearRemovedSketchMeasure,
  };
}
