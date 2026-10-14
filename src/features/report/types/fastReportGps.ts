import type { TraceTransportMode } from '@/features/report/constants/reportTrace.constants';

export interface FastReportOffsetSetting {
  enabled: boolean;
  value: number;
}

export interface FastReportOffsetSettings {
  planimetric: FastReportOffsetSetting;
  altimetric: FastReportOffsetSetting;
}

export type RecordingIntervalUnit = 'meters' | 'seconds';

export interface RecordingInterval {
  value: number;
  unit: RecordingIntervalUnit;
}

export interface FastReportGpsSettings {
  offsetByMode: Record<TraceTransportMode, FastReportOffsetSettings>;
  toleranceByMode: Record<TraceTransportMode, number>;
  recordingIntervalByMode: Record<TraceTransportMode, RecordingInterval>;
}

export type FastReportGpsQuality = 'fix' | 'dgps-fix' | 'invalid';

export interface FastReportGpsInfo {
  quality: FastReportGpsQuality;
  pdop?: number;
  heading?: number | null;
  battery: string;
}
