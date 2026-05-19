import { useCallback, useEffect, useRef, useState } from 'react';

import type Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import VectorLayer from 'ol/layer/Vector';
import type OlMap from 'ol/Map';
import { unByKey } from 'ol/Observable';
import VectorSource from 'ol/source/Vector';
import type { EventsKey } from 'ol/events';
import GeolocationDraw, { type GeolocationDrawEvent } from 'ol-ext/interaction/GeolocationDraw';

import { EspaceCo_KeepAwake } from '@/platform/device/keepAwake';

import type {
  FastReportGpsInfo,
  FastReportGpsQuality,
} from '@/features/report/types/fastReportGps';
import {
  DEFAULT_TRACE_RECORDING_SETTINGS,
  DEFAULT_TRACE_TRANSPORT_MODE,
  TRACE_LAYER_NAME,
  TRACE_LAYER_TITLE,
  TRACE_MIN_ZOOM,
  TRACE_SOUND_RECORDING_END_SRC,
  TRACE_SOUND_RECORDING_POINT_SRC,
  TRACE_STYLE,
  type TraceRecordingSettings,
  type TraceTransportMode,
} from '@/features/report/constants/reportTrace.constants';
import {
  calculateTraceStats,
  cleanLineStringCoordinates,
  findLineStringFeature,
  getLineStringGeometry,
} from '@/features/report/utils/traceGeometry';

import { EspaceCo_SettingsStore } from '@/infra/persistence/settingsStore';

import { createAudioPlayer, playAudioOnce, type AudioPlayer } from '@/shared/utils/audioPlayer';

export interface UseReportTraceSessionOptions {
  /** OpenLayers map instance used to attach layer + interaction. */
  map?: OlMap | null;
  /** Enables or disables the whole session lifecycle. */
  enabled: boolean;
  toleranceByMode?: Record<TraceTransportMode, number>;
}

/**
 * Public state and actions exposed by the trace session.
 */
export interface UseReportTraceSessionReturn {
  isRecording: boolean;
  isPaused: boolean;
  hasTrace: boolean;
  tracePointCount: number;
  traceDistanceMeters: number;
  gpsInfo: FastReportGpsInfo | null;
  transportMode: TraceTransportMode;
  isAudioEnabled: boolean;
  startRecording: () => void;
  togglePause: () => void;
  finalizeRecording: () => Feature<Geometry>[];
  discardTrace: () => void;
  toggleTransportMode: () => void;
  toggleAudio: () => void;
  startRecordingFromCoordinate: (coordinate: number[]) => void;
  getTraceFeatures: () => Feature<Geometry>[];
  clearSession: () => void;
}

interface GeolocationDrawInternals extends GeolocationDraw {
  path_: number[][];
  geolocation: {
    getPosition: () => number[] | undefined;
    getAltitude: () => number | undefined;
  };
  sketch_: Feature<Geometry>[];
}

interface NmeaPosition {
  geoidal: number;
  pdop?: number;
  quality?: string | null;
}

interface GeolocationDrawLocation {
  getPosition: () => number[];
  getAltitude: () => number | undefined;
  getHeading: () => number | undefined;
  _position?: {
    nmea?: NmeaPosition;
    coords?: {
      heading?: number | null;
    };
  };
}

function getGpsQuality(quality: string | null | undefined): FastReportGpsQuality {
  if (quality === 'fix' || quality === 'dgps-fix') return quality;
  return 'invalid';
}

/**
 * Manages one report trace recording session:
 * - creates/removes the temporary trace layer and interaction
 * - drives recording controls (start/pause/finalize/cancel)
 * - exposes computed stats for the toolbar
 */
export function useReportTraceSession({
  map,
  enabled,
  toleranceByMode,
}: UseReportTraceSessionOptions): UseReportTraceSessionReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasTrace, setHasTrace] = useState(false);
  const [tracePointCount, setTracePointCount] = useState(0);
  const [traceDistanceMeters, setTraceDistanceMeters] = useState(0);
  const [gpsInfo, setGpsInfo] = useState<FastReportGpsInfo | null>(null);
  const [transportMode, setTransportMode] = useState<TraceTransportMode>(DEFAULT_TRACE_TRANSPORT_MODE);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [traceRecordingSettings, setTraceRecordingSettings] = useState<TraceRecordingSettings>({
    minAccuracy: DEFAULT_TRACE_RECORDING_SETTINGS.minAccuracy,
    tolerance: DEFAULT_TRACE_RECORDING_SETTINGS.tolerance,
  });

  const interactionRef = useRef<GeolocationDraw | null>(null);
  const traceSourceRef = useRef<VectorSource<Feature<Geometry>> | null>(null);
  const pointSoundPlayerRef = useRef<AudioPlayer | null>(null);

  // OL listeners are registered once; refs keep latest UI config without rebuilding the interaction.
  const transportModeRef = useRef<TraceTransportMode>(DEFAULT_TRACE_TRANSPORT_MODE);
  const audioEnabledRef = useRef(isAudioEnabled);
  const traceRecordingSettingsRef = useRef(traceRecordingSettings);
  const toleranceByModeRef = useRef(toleranceByMode);

  const getToleranceForMode = useCallback((mode: TraceTransportMode) => {
    return toleranceByModeRef.current?.[mode] ?? traceRecordingSettingsRef.current.tolerance;
  }, []);

  const resetTraceState = useCallback(() => {
    setHasTrace(false);
    setTracePointCount(0);
    setTraceDistanceMeters(0);
  }, []);

  const syncStatsFromLineString = useCallback((line: ReturnType<typeof getLineStringGeometry>) => {
    if (!line) {
      resetTraceState();
      return;
    }
    const stats = calculateTraceStats(line);
    setHasTrace(stats.pointCount > 0);
    setTracePointCount(stats.pointCount);
    setTraceDistanceMeters(stats.distanceMeters);
  }, [resetTraceState]);

  const syncStatsFromSource = useCallback(() => {
    const source = traceSourceRef.current;
    if (!source) {
      resetTraceState();
      return;
    }

    const features = source.getFeatures();
    const lineFeature = findLineStringFeature(features);
    const lineString = getLineStringGeometry(lineFeature);
    syncStatsFromLineString(lineString);
  }, [resetTraceState, syncStatsFromLineString]);

  const playTracePointSound = useCallback(() => {
    if (!audioEnabledRef.current) return;
    pointSoundPlayerRef.current?.play();
  }, []);

  const stopTracePointSound = useCallback(() => {
    pointSoundPlayerRef.current?.stop();
  }, []);

  const playTraceEndSound = useCallback(() => {
    if (!audioEnabledRef.current) return;
    stopTracePointSound();
    playAudioOnce(TRACE_SOUND_RECORDING_END_SRC);
  }, [stopTracePointSound]);

  /**
   * Returns the current trace as cloned features for form persistence.
   * Only the recorded LineString is exported.
   */
  const getTraceFeatures = useCallback((): Feature<Geometry>[] => {
    const source = traceSourceRef.current;
    if (!source) return [];

    const lineFeature = findLineStringFeature(source.getFeatures());
    if (!lineFeature) return [];

    return [lineFeature.clone()];
  }, []);

  const clearRecordingFlags = useCallback(() => {
    setIsRecording(false);
    setIsPaused(false);
  }, []);

  const deactivateInteraction = useCallback((interaction: GeolocationDraw | null | undefined) => {
    if (interaction?.getActive()) {
      interaction.setActive(false);
    }
  }, []);

  const appendCurrentPositionToTrace = useCallback(() => {
    const interaction = interactionRef.current as GeolocationDrawInternals | null;
    if (!interaction?.getActive()) return;

    const currentPosition = interaction.geolocation.getPosition();
    if (!currentPosition) return;

    const nextCoordinate = [
      currentPosition[0],
      currentPosition[1],
      Math.round((interaction.geolocation.getAltitude() || 0) * 100) / 100,
      Math.round(Date.now() / 1000),
    ];
    const lastCoordinate = interaction.path_[interaction.path_.length - 1];
    if (nextCoordinate[0] === lastCoordinate?.[0] && nextCoordinate[1] === lastCoordinate?.[1]) return;

    interaction.path_.push(nextCoordinate);
    const line = getLineStringGeometry(interaction.sketch_[1]);
    if (line) {
      line.appendCoordinate(nextCoordinate);
      cleanLineStringCoordinates(line);
    }
  }, []);

  const getPositionWithMetadata = useCallback((location: GeolocationDrawLocation) => {
    const position = location.getPosition();
    position.push(Math.round((location.getAltitude() || 0) * 100) / 100);
    position.push(Math.round(Date.now() / 1000));

    const nmea = location._position?.nmea;
    if (!nmea) {
      setGpsInfo(null);
      return position;
    }

    position.push(nmea.geoidal);
    setGpsInfo({
      quality: getGpsQuality(nmea.quality),
      pdop: nmea.pdop,
      heading: location._position?.coords?.heading ?? location.getHeading(),
      battery: '%',
    });

    return position;
  }, []);

  /**
   * Starts a new recording (clears previous draft trace), or resumes when paused.
   */
  const startRecordingFromCoordinate = useCallback((seedCoordinate?: number[]) => {
    const interaction = interactionRef.current;
    const source = traceSourceRef.current;
    if (!interaction || !source) return;

    if (!interaction.getActive()) {
      stopTracePointSound();
      source.clear(true);
      resetTraceState();
      interaction.set('tolerance', getToleranceForMode(transportMode));
      interaction.set('minAccuracy', traceRecordingSettingsRef.current.minAccuracy);
      interaction.setActive(true);
      interaction.setFollowTrack('auto');
      interaction.pause(false);
      if (seedCoordinate) {
        (interaction as GeolocationDrawInternals).path_.push(seedCoordinate);
      }
      setIsRecording(true);
      setIsPaused(false);
      return;
    }

    if (interaction.isPaused()) {
      interaction.pause(false);
      interaction.setFollowTrack('auto');
      setIsPaused(false);
    }
  }, [getToleranceForMode, resetTraceState, stopTracePointSound, transportMode]);

  const startRecording = useCallback(() => {
    startRecordingFromCoordinate();
  }, [startRecordingFromCoordinate]);

  const togglePause = useCallback(() => {
    const interaction = interactionRef.current;
    if (!interaction || !interaction.getActive()) return;

    const nextPaused = !interaction.isPaused();
    interaction.pause(nextPaused);
    if (!nextPaused) {
      interaction.setFollowTrack('auto');
    }
    setIsPaused(nextPaused);
  }, []);

  /**
   * Stops the interaction and returns the recorded trace for form integration.
   * Plays the "recording end" sound when a trace exists.
   */
  const finalizeRecording = useCallback((): Feature<Geometry>[] => {
    appendCurrentPositionToTrace();
    deactivateInteraction(interactionRef.current);
    clearRecordingFlags();
    const traceFeatures = getTraceFeatures();
    if (traceFeatures.length > 0) {
      playTraceEndSound();
    }
    return traceFeatures;
  }, [appendCurrentPositionToTrace, clearRecordingFlags, deactivateInteraction, getTraceFeatures, playTraceEndSound]);

  /**
   * Cancels the current draft trace and fully resets UI/session state.
   */
  const discardTrace = useCallback(() => {
    const interaction = interactionRef.current;
    const source = traceSourceRef.current;

    deactivateInteraction(interaction);
    interaction?.reset();
    source?.clear(true);

    stopTracePointSound();
    clearRecordingFlags();
    resetTraceState();
    setGpsInfo(null);
  }, [clearRecordingFlags, deactivateInteraction, resetTraceState, stopTracePointSound]);

  const toggleTransportMode = useCallback(() => {
    setTransportMode((previousMode) => (previousMode === 'car' ? 'pedestrian' : 'car'));
  }, []);

  const toggleAudio = useCallback(() => {
    setIsAudioEnabled((enabledValue) => {
      const nextValue = !enabledValue;
      audioEnabledRef.current = nextValue;
      return nextValue;
    });
  }, []);

  useEffect(() => {
    transportModeRef.current = transportMode;
    const interaction = interactionRef.current;
    if (!interaction) return;
    interaction.set('tolerance', getToleranceForMode(transportMode));
  }, [getToleranceForMode, transportMode]);

  useEffect(() => {
    traceRecordingSettingsRef.current = traceRecordingSettings;
    const interaction = interactionRef.current;
    if (!interaction) return;
    interaction.set('minAccuracy', traceRecordingSettings.minAccuracy);
    interaction.set('tolerance', getToleranceForMode(transportModeRef.current));
  }, [getToleranceForMode, traceRecordingSettings]);

  useEffect(() => {
    toleranceByModeRef.current = toleranceByMode;
    const interaction = interactionRef.current;
    if (!interaction) return;
    interaction.set('tolerance', getToleranceForMode(transportModeRef.current));
  }, [getToleranceForMode, toleranceByMode]);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      const settings = await EspaceCo_SettingsStore.getTraceRecordingSettings();
      if (!isMounted) return;
      setTraceRecordingSettings(settings);
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    pointSoundPlayerRef.current = createAudioPlayer(TRACE_SOUND_RECORDING_POINT_SRC);

    return () => {
      pointSoundPlayerRef.current?.destroy();
      pointSoundPlayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!enabled || !map) return;

    const traceSource = new VectorSource<Feature<Geometry>>();
    const traceLayer = new VectorLayer({
      source: traceSource,
      style: TRACE_STYLE,
      properties: {
        name: TRACE_LAYER_NAME,
        title: TRACE_LAYER_TITLE,
      },
      zIndex: Infinity,
    });

    const geolocationInteraction = new GeolocationDraw({
      source: traceSource,
      type: 'LineString',
      minZoom: TRACE_MIN_ZOOM,
      followTrack: 'auto',
      tolerance: getToleranceForMode(transportModeRef.current),
      minAccuracy: traceRecordingSettingsRef.current.minAccuracy,
      style: TRACE_STYLE,
    });
    (geolocationInteraction as GeolocationDrawInternals).getPosition = (location) => {
      return getPositionWithMetadata(location as unknown as GeolocationDrawLocation);
    };
    geolocationInteraction.setActive(false);

    map.addLayer(traceLayer);
    map.addInteraction(geolocationInteraction);

    traceSourceRef.current = traceSource;
    interactionRef.current = geolocationInteraction;

    const onDrawing = (event: GeolocationDrawEvent) => {
      const line = getLineStringGeometry(event.feature as Feature<Geometry>);
      syncStatsFromLineString(line);
      if (line) {
        playTracePointSound();
      }
    };

    const onActiveChange = () => {
      const isActive = geolocationInteraction.getActive();
      setIsRecording(isActive);
      if (!isActive) {
        setIsPaused(false);
        syncStatsFromSource();
        void EspaceCo_KeepAwake.allowSleep();
      } else {
        void EspaceCo_KeepAwake.keepAwake();
      }
    };

    const listenerKeys: EventsKey[] = [
      geolocationInteraction.on('drawing', onDrawing),
      geolocationInteraction.on('change:active', onActiveChange),
      traceSource.on('change', syncStatsFromSource),
    ];

    return () => {
      unByKey(listenerKeys);
      geolocationInteraction.setActive(false);

      if (map.getInteractions().getArray().includes(geolocationInteraction)) {
        map.removeInteraction(geolocationInteraction);
      }
      if (map.getLayers().getArray().includes(traceLayer)) {
        map.removeLayer(traceLayer);
      }

      if (interactionRef.current === geolocationInteraction) {
        interactionRef.current = null;
      }
      if (traceSourceRef.current === traceSource) {
        traceSourceRef.current = null;
      }

      clearRecordingFlags();
      resetTraceState();
      setGpsInfo(null);
      stopTracePointSound();
      void EspaceCo_KeepAwake.allowSleep();
    };
  }, [
    clearRecordingFlags,
    enabled,
    getPositionWithMetadata,
    getToleranceForMode,
    map,
    playTracePointSound,
    resetTraceState,
    syncStatsFromLineString,
    syncStatsFromSource,
    stopTracePointSound,
  ]);

  return {
    isRecording,
    isPaused,
    hasTrace,
    tracePointCount,
    traceDistanceMeters,
    gpsInfo,
    transportMode,
    isAudioEnabled,
    startRecording,
    togglePause,
    finalizeRecording,
    discardTrace,
    toggleTransportMode,
    toggleAudio,
    startRecordingFromCoordinate,
    getTraceFeatures,
    clearSession: discardTrace,
  };
}
