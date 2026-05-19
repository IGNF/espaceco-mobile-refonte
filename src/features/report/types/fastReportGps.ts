import type { TraceTransportMode } from '@/features/report/constants/reportTrace.constants';

export interface FastReportOffsetSetting {
  enabled: boolean;
  value: number;
}

export interface FastReportOffsetSettings {
  planimetric: FastReportOffsetSetting;
  altimetric: FastReportOffsetSetting;
}

export interface FastReportGpsSettings {
  offsetByMode: Record<TraceTransportMode, FastReportOffsetSettings>;
  toleranceByMode: Record<TraceTransportMode, number>;
}

export type FastReportGpsQuality = 'fix' | 'dgps-fix' | 'invalid';

export interface FastReportGpsInfo {
  quality: FastReportGpsQuality;
  pdop?: number;
  heading?: number | null;
  battery: string;
}
