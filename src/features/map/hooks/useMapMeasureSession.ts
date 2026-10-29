import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Feature from 'ol/Feature';
import type { Coordinate } from 'ol/coordinate';
import type { Geometry } from 'ol/geom';
import VectorLayer from 'ol/layer/Vector';
import type OlMap from 'ol/Map';
import type MapBrowserEvent from 'ol/MapBrowserEvent';
import Overlay from 'ol/Overlay';
import DoubleClickZoom from 'ol/interaction/DoubleClickZoom';
import VectorSource from 'ol/source/Vector';

import {
  buildMeasureSketch,
  hasEnoughMeasureVertices,
  measureStyle,
  type MeasureMode,
  type MeasureSketch,
} from '@/features/map/utils/measureGeometry';

import labelStyles from '@/features/map/components/MapMeasureBar.module.css';

type MeasurePhase = 'drawing' | 'validated';

interface MeasureLabelHandle {
  overlay: Overlay;
  element: HTMLDivElement;
}

export function useMapMeasureSession(map: OlMap | null) {
  const [isActive, setIsActive] = useState(false);
  const [mode, setModeState] = useState<MeasureMode>('length');
  const [phase, setPhase] = useState<MeasurePhase>('drawing');
  const [vertices, setVertices] = useState<Coordinate[]>([]);

  const phaseRef = useRef(phase);
  const modeRef = useRef(mode);
  const verticesRef = useRef(vertices);
  const sourceRef = useRef<VectorSource<Feature<Geometry>> | null>(null);
  const labelsRef = useRef<MeasureLabelHandle[]>([]);

  useEffect(() => {
    phaseRef.current = phase;
    modeRef.current = mode;
    verticesRef.current = vertices;
  }, [mode, phase, vertices]);

  const resetDrawing = useCallback(() => {
    setModeState('length');
    setPhase('drawing');
    setVertices([]);
  }, []);

  const close = useCallback(() => {
    resetDrawing();
    setIsActive(false);
  }, [resetDrawing]);

  const open = useCallback(() => {
    resetDrawing();
    setIsActive(true);
  }, [resetDrawing]);

  const undo = useCallback(() => {
    setVertices((current) => current.slice(0, -1));
    setPhase('drawing');
  }, []);

  const validate = useCallback(() => {
    if (phaseRef.current !== 'drawing') {
      return;
    }
    if (!hasEnoughMeasureVertices(modeRef.current, verticesRef.current.length)) {
      return;
    }
    setPhase('validated');
  }, []);

  const setMode = useCallback((nextMode: MeasureMode) => {
    setModeState(nextMode);
    setPhase((current) => {
      if (current !== 'validated') {
        return current;
      }
      return hasEnoughMeasureVertices(nextMode, verticesRef.current.length)
        ? 'validated'
        : 'drawing';
    });
  }, []);

  /**
   * Owns the temporary measure layer while the tool is open.
   * Double-tap zoom is suspended so it does not fight with placing vertices,
   * and restored when the session ends.
   */
  useEffect(() => {
    if (!map || !isActive) {
      return;
    }

    const source = new VectorSource<Feature<Geometry>>();
    const layer = new VectorLayer({
      source,
      style: measureStyle,
      zIndex: Infinity,
      properties: {
        name: 'measure',
        displayInLayerSwitcher: false,
      },
    });
    sourceRef.current = source;
    map.addLayer(layer);

    const doubleClickZoom = map.getInteractions().getArray()
      .find((interaction) => interaction instanceof DoubleClickZoom);
    const wasDoubleClickZoomActive = doubleClickZoom?.getActive() ?? false;
    doubleClickZoom?.setActive(false);

    const onClick = (event: MapBrowserEvent) => {
      // OpenLayers reuses the coordinate array on the next event, so copy it before storing it in React state.
      const coordinate = event.coordinate.slice();
      if (phaseRef.current === 'validated') {
        // A tap after validation discards the frozen measure and starts a new one here.
        // The refs are updated now so a second tap before the next render extends this measure instead of starting another one.
        phaseRef.current = 'drawing';
        verticesRef.current = [coordinate];
        setPhase('drawing');
        setVertices([coordinate]);
        return;
      }

      setVertices((current) => [...current, coordinate]);
    };

    map.on('click', onClick);

    return () => {
      map.un('click', onClick);
      labelsRef.current.forEach((label) => map.removeOverlay(label.overlay));
      labelsRef.current = [];
      map.removeLayer(layer);
      sourceRef.current = null;
      doubleClickZoom?.setActive(wasDoubleClickZoomActive);
    };
  }, [isActive, map]);

  /**
   * Geometry, labels and the bar total are derived together so they cannot drift apart. Memoized so unrelated home-screen renders do not rebuild them.
   */
  const sketch = useMemo(() => {
    if (!map || !isActive) {
      return null;
    }

    return buildMeasureSketch(
      mode,
      vertices,
      map.getView().getProjection(),
    );
  }, [isActive, map, mode, vertices]);

  useEffect(() => {
    const source = sourceRef.current;
    if (!map || !sketch || !source) {
      return;
    }

    syncMeasureFeature(source, sketch.geometry);
    syncMeasureLabels(map, labelsRef.current, sketch.labels);
  }, [map, sketch]);

  return {
    isActive,
    mode,
    isValidated: phase === 'validated',
    summary: sketch?.summary ?? null,
    canUndo: vertices.length > 0,
    canValidate: phase === 'drawing' && hasEnoughMeasureVertices(mode, vertices.length),
    open,
    close,
    undo,
    validate,
    setMode,
  };
}

function syncMeasureFeature(
  source: VectorSource<Feature<Geometry>>,
  geometry: MeasureSketch['geometry'],
): void {
  const feature = source.getFeatures()[0] ?? null;
  if (!geometry) {
    source.clear();
    return;
  }

  if (!feature) {
    source.addFeature(new Feature(geometry));
    return;
  }

  feature.setGeometry(geometry);
}

/**
 * Reuses one overlay per label. Extra overlays from a previous, longer sketch are hidden instead of destroyed, then removed when the session ends.
 */
function syncMeasureLabels(
  map: OlMap,
  pool: MeasureLabelHandle[],
  labels: MeasureSketch['labels'],
): void {
  labels.forEach((label, index) => {
    const handle = pool[index] ?? createMeasureLabel(map, pool);
    handle.element.className = label.kind === 'total'
      ? labelStyles.totalLabel
      : labelStyles.segmentLabel;
    handle.element.textContent = label.text;
    handle.overlay.setOffset(label.kind === 'total' ? [0, -14] : [0, -4]);
    handle.overlay.setPosition(label.coordinate);
  });

  for (let index = labels.length; index < pool.length; index += 1) {
    pool[index].overlay.setPosition(undefined);
  }
}

function createMeasureLabel(map: OlMap, pool: MeasureLabelHandle[]): MeasureLabelHandle {
  const element = document.createElement('div');
  const overlay = new Overlay({
    element,
    positioning: 'bottom-center',
    stopEvent: false,
  });
  map.addOverlay(overlay);
  const handle = { overlay, element };
  pool.push(handle);
  return handle;
}
