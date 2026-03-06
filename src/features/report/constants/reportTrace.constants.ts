import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';
import tracePointBeepSound from '@/shared/assets/sounds/bip.mp3';
import traceEndBeepSound from '@/shared/assets/sounds/bip2.mp3';

export type TraceTransportMode = 'pedestrian' | 'car';
export interface TraceRecordingSettings {
  minAccuracy: number;
  toleranceByMode: Record<TraceTransportMode, number>;
}

export const DEFAULT_TRACE_TRANSPORT_MODE: TraceTransportMode = 'car';

// OpenLayers layer name used to identify the temporary GPS trace layer on the map.
export const TRACE_LAYER_NAME = 'ReportTraceDraft';

// Title for the temporary trace layer
export const TRACE_LAYER_TITLE = 'Trace GPS temporaire';

// Minimum accepted GPS accuracy (in meters) before points are added to the trace.
export const TRACE_MIN_ACCURACY = 100;

// Minimum zoom level when trace recording is active.
export const TRACE_MIN_ZOOM = 17;

// Point simplification tolerance (in meters) depending on transport mode.
export const TRACE_TOLERANCE_BY_MODE: Record<TraceTransportMode, number> = {
  pedestrian: 0,
  car: 5,
};

export const DEFAULT_TRACE_RECORDING_SETTINGS: TraceRecordingSettings = {
  minAccuracy: TRACE_MIN_ACCURACY,
  toleranceByMode: { ...TRACE_TOLERANCE_BY_MODE },
};

// Audio feedback sounds used while recording and validating a trace.
export const TRACE_SOUND_RECORDING_POINT_SRC = tracePointBeepSound;
export const TRACE_SOUND_RECORDING_END_SRC = traceEndBeepSound;

export const TRACE_STYLE = [
  new Style({
    stroke: new Stroke({
      color: 'rgba(255, 255, 255, 0.88)',
      width: 6,
      lineCap: 'round',
      lineJoin: 'round',
    }),
  }),
  new Style({
    stroke: new Stroke({
      color: '#3f47ff',
      width: 4,
      lineCap: 'round',
      lineJoin: 'round',
    }),
    image: new CircleStyle({
      radius: 5,
      fill: new Fill({ color: '#3f47ff' }),
      stroke: new Stroke({
        color: '#ffffff',
        width: 2,
      }),
    }),
  }),
];
