import { useCallback, useEffect, useRef, useState } from 'react';

import type Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import VectorLayer from 'ol/layer/Vector';
import type OlMap from 'ol/Map';
import { unByKey } from 'ol/Observable';
import Select, { type SelectEvent } from 'ol/interaction/Select';
import VectorSource from 'ol/source/Vector';
import type { EventsKey } from 'ol/events';
import GeolocationDraw, { type GeolocationDrawEvent } from 'ol-ext/interaction/GeolocationDraw';

import { EspaceCo_KeepAwake } from '@/platform/device/keepAwake';
import {
  DEFAULT_TRACE_RECORDING_SETTINGS,
  TRACE_LAYER_TITLE,
  TRACE_MIN_ZOOM,
  TRACE_STYLE,
  type TraceRecordingSettings,
} from '@/features/report/constants/reportTrace.constants';
import {
  calculateTraceStats,
  findLineStringFeature,
  getLineStringGeometry,
} from '@/features/report/utils/traceGeometry';
import { EspaceCo_SettingsStore } from '@/infra/persistence/settingsStore';

const GPS_SKETCH_LAYER_NAME = 'HomeGpsSketch';
const GPS_SKETCH_SELECT_HIT_TOLERANCE = 12;

export interface UseGpsSketchTrackingSessionOptions {
  map: OlMap | null;
  enabled: boolean;
  selectionEnabled: boolean;
  onSelectSketch?: (feature: Feature<Geometry>, pixel: number[]) => boolean;
}

export interface UseGpsSketchTrackingSessionReturn {
  isRecording: boolean;
  isPaused: boolean;
  selectedSketch: Feature<Geometry> | null;
  pointCount: number;
  distanceMeters: number;
  startRecording: () => void;
  togglePause: () => void;
  stopRecording: () => void;
  clearSelection: () => void;
  selectSketch: (feature: Feature<Geometry>) => void;
  getSketchesAtPixel: (pixel: number[]) => Feature<Geometry>[];
}

/**
 * Owns the map-side GPS sketch recording session for the home screen.
 * It keeps the OpenLayers vector layer and interactions alive independently of
 * the record controls so a finalized trace stays visible and selectable.
 */
export function useGpsSketchTrackingSession({
  map,
  enabled,
  selectionEnabled,
  onSelectSketch,
}: UseGpsSketchTrackingSessionOptions): UseGpsSketchTrackingSessionReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedSketch, setSelectedSketch] = useState<Feature<Geometry> | null>(null);
  const [pointCount, setPointCount] = useState(0);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [recordingSettings, setRecordingSettings] = useState<TraceRecordingSettings>({
    minAccuracy: DEFAULT_TRACE_RECORDING_SETTINGS.minAccuracy,
    tolerance: DEFAULT_TRACE_RECORDING_SETTINGS.tolerance,
  });

  const sourceRef = useRef<VectorSource<Feature<Geometry>> | null>(null);
  const layerRef = useRef<VectorLayer<VectorSource<Feature<Geometry>>> | null>(null);
  const interactionRef = useRef<GeolocationDraw | null>(null);
  const selectInteractionRef = useRef<Select | null>(null);
  const onSelectSketchRef = useRef(onSelectSketch);
  const recordingSettingsRef = useRef(recordingSettings);

  /**
   * Syncs the lightweight UI stats from the current recorded LineString.
   * 'GeolocationDraw' mutates the same feature while recording, so this is
   * called from both interaction events and source change events.
   */
  const syncStatsFromLineString = useCallback((feature: Feature<Geometry> | null | undefined) => {
    const line = getLineStringGeometry(feature);
    if (!line) {
      setPointCount(0);
      setDistanceMeters(0);
      return;
    }

    const stats = calculateTraceStats(line);
    setPointCount(stats.pointCount);
    setDistanceMeters(stats.distanceMeters);
  }, []);

  const syncStatsFromSource = useCallback(() => {
    const source = sourceRef.current;
    if (!source) {
      syncStatsFromLineString(null);
      return;
    }

    syncStatsFromLineString(findLineStringFeature(source.getFeatures()));
  }, [syncStatsFromLineString]);

  /**
   * Clears only the OpenLayers selection, not the recorded feature itself.
   * The trace must remain visible after closing the action dialog.
   */
  const clearSelection = useCallback(() => {
    selectInteractionRef.current?.getFeatures().clear();
    setSelectedSketch(null);
  }, []);

  const selectSketch = useCallback((feature: Feature<Geometry>) => {
    const selectedFeatures = selectInteractionRef.current?.getFeatures();
    selectedFeatures?.clear();
    selectedFeatures?.push(feature);
    setSelectedSketch(feature);
    syncStatsFromLineString(feature);
  }, [syncStatsFromLineString]);

  const getSketchesAtPixel = useCallback((pixel: number[]): Feature<Geometry>[] => {
    if (!map || !layerRef.current) return [];

    const features: Feature<Geometry>[] = [];
    map.forEachFeatureAtPixel(
      pixel,
      (feature) => {
        features.push(feature as Feature<Geometry>);
      },
      {
        hitTolerance: GPS_SKETCH_SELECT_HIT_TOLERANCE,
        layerFilter: (layer) => layer === layerRef.current,
      }
    );

    return features;
  }, [map]);

  const deactivateInteraction = useCallback(() => {
    const interaction = interactionRef.current;
    if (!interaction) return;

    interaction.setActive(false);
    interaction.reset();
    setIsRecording(false);
    setIsPaused(false);
    syncStatsFromSource();
  }, [syncStatsFromSource]);

  /**
   * Starts a fresh GPS sketch. Existing finalized traces stay in the source so
   * users can record several traces in a row before selecting one.
   */
  const startRecording = useCallback(() => {
    const interaction = interactionRef.current;
    if (!interaction) return;

    clearSelection();
    syncStatsFromLineString(null);
    interaction.set('minAccuracy', recordingSettingsRef.current.minAccuracy);
    interaction.set('tolerance', recordingSettingsRef.current.tolerance);
    interaction.setActive(true);
    interaction.pause(false);
    setIsRecording(true);
    setIsPaused(false);
  }, [clearSelection, syncStatsFromLineString]);

  /**
   * Pauses or resumes the same 'GeolocationDraw' path. This preserves the
   * existing coordinates so resumed points extend the same LineString.
   */
  const togglePause = useCallback(() => {
    const interaction = interactionRef.current;
    if (!interaction || !interaction.getActive()) return;

    const nextPaused = !interaction.isPaused();
    interaction.pause(nextPaused);
    setIsPaused(nextPaused);
  }, []);

  const stopRecording = useCallback(() => {
    deactivateInteraction();
  }, [deactivateInteraction]);

  useEffect(() => {
    onSelectSketchRef.current = onSelectSketch;
  }, [onSelectSketch]);

  useEffect(() => {
    recordingSettingsRef.current = recordingSettings;
    const interaction = interactionRef.current;
    if (!interaction) return;

    interaction.set('minAccuracy', recordingSettings.minAccuracy);
    interaction.set('tolerance', recordingSettings.tolerance);
  }, [recordingSettings]);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      const settings = await EspaceCo_SettingsStore.getTraceRecordingSettings();
      if (!isMounted) return;
      setRecordingSettings(settings);
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    selectInteractionRef.current?.setActive(selectionEnabled && !isRecording);
  }, [isRecording, selectionEnabled]);

  /**
   * Installs the dedicated GPS sketch layer plus two interactions:
   * 'GeolocationDraw' records the line, and 'Select' lets users pick finalized
   * home-screen traces without interfering with other map feature workflows.
   */
  useEffect(() => {
    if (!enabled || !map) return;

    const source = new VectorSource<Feature<Geometry>>();
    const sketchLayer = new VectorLayer({
      source,
      style: TRACE_STYLE,
      properties: {
        name: GPS_SKETCH_LAYER_NAME,
        title: TRACE_LAYER_TITLE,
        geolocation: true,
        displayInLayerSwitcher: false,
      },
      zIndex: Infinity,
    });

    const geolocationInteraction = new GeolocationDraw({
      source,
      type: 'LineString',
      minZoom: TRACE_MIN_ZOOM,
      followTrack: false,
      tolerance: recordingSettingsRef.current.tolerance,
      minAccuracy: recordingSettingsRef.current.minAccuracy,
      style: TRACE_STYLE,
    });
    geolocationInteraction.setActive(false);

    const selectInteraction = new Select({
      hitTolerance: GPS_SKETCH_SELECT_HIT_TOLERANCE,
      layers: (layer) => layer === sketchLayer,
      filter: (feature) => getLineStringGeometry(feature as Feature<Geometry>) !== null,
    });
    selectInteraction.setActive(false);

    map.addLayer(sketchLayer);
    map.addInteraction(geolocationInteraction);
    map.addInteraction(selectInteraction);

    sourceRef.current = source;
    layerRef.current = sketchLayer;
    interactionRef.current = geolocationInteraction;
    selectInteractionRef.current = selectInteraction;

    const onDrawing = (event: GeolocationDrawEvent) => {
      syncStatsFromLineString(event.feature as Feature<Geometry>);
    };

    const onActiveChange = () => {
      const active = geolocationInteraction.getActive();
      setIsRecording(active);
      if (!active) {
        setIsPaused(false);
        syncStatsFromSource();
        void EspaceCo_KeepAwake.allowSleep();
      } else {
        void EspaceCo_KeepAwake.keepAwake();
      }
    };

    const onSelect = (event: SelectEvent) => {
      const feature = event.selected[0] as Feature<Geometry> | undefined;
      if (feature && onSelectSketchRef.current?.(feature, event.mapBrowserEvent.pixel)) {
        selectInteraction.getFeatures().clear();
        return;
      }

      setSelectedSketch(feature ?? null);
      syncStatsFromLineString(feature);
    };

    const listenerKeys: EventsKey[] = [
      geolocationInteraction.on('drawing', onDrawing),
      geolocationInteraction.on('change:active', onActiveChange),
      source.on('change', syncStatsFromSource),
      selectInteraction.on('select', onSelect),
    ];

    return () => {
      unByKey(listenerKeys);
      geolocationInteraction.setActive(false);

      if (map.getInteractions().getArray().includes(selectInteraction)) {
        map.removeInteraction(selectInteraction);
      }
      if (map.getInteractions().getArray().includes(geolocationInteraction)) {
        map.removeInteraction(geolocationInteraction);
      }
      if (map.getLayers().getArray().includes(sketchLayer)) {
        map.removeLayer(sketchLayer);
      }

      if (sourceRef.current === source) {
        sourceRef.current = null;
      }
      if (layerRef.current === sketchLayer) {
        layerRef.current = null;
      }
      if (interactionRef.current === geolocationInteraction) {
        interactionRef.current = null;
      }
      if (selectInteractionRef.current === selectInteraction) {
        selectInteractionRef.current = null;
      }

      setIsRecording(false);
      setIsPaused(false);
      setSelectedSketch(null);
      syncStatsFromLineString(null);
      void EspaceCo_KeepAwake.allowSleep();
    };
  }, [
    enabled,
    map,
    syncStatsFromLineString,
    syncStatsFromSource,
  ]);

  return {
    isRecording,
    isPaused,
    selectedSketch,
    pointCount,
    distanceMeters,
    startRecording,
    togglePause,
    stopRecording,
    clearSelection,
    selectSketch,
    getSketchesAtPixel,
  };
}
