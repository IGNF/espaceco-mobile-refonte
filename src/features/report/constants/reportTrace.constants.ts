import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';

export type TraceTransportMode = 'pedestrian' | 'car';

export const DEFAULT_TRACE_TRANSPORT_MODE: TraceTransportMode = 'car';

// OpenLayers layer name used to identify the temporary GPS trace layer on the map.
export const TRACE_LAYER_NAME = 'ReportTraceDraft';

// Title for the temporary trace layer
export const TRACE_LAYER_TITLE = 'Trace GPS temporaire';

// Minimum accepted GPS accuracy (in meters) before points are added to the trace.
// In the legacy app, this can be changed in the settings.
export const TRACE_MIN_ACCURACY = 20;

// Minimum zoom level when trace recording is active.
export const TRACE_MIN_ZOOM = 17;

// Point simplification tolerance (in meters) depending on transport mode.
// In the legacy app, this can be changed in the settings.
export const TRACE_TOLERANCE_BY_MODE: Record<TraceTransportMode, number> = {
  pedestrian: 0,
  car: 5,
};

// Audio feedback defaults used when recording the GPS trace.
export const TRACE_BEEP_FREQUENCY = 880;
export const TRACE_BEEP_GAIN = 0.03;
export const TRACE_BEEP_DURATION_MS = 70;

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
