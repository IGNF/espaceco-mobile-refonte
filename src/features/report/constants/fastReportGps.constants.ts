import { TRACE_TOLERANCE } from '@/features/report/constants/reportTrace.constants';
import type {
  FastReportGpsSettings,
  FastReportOffsetSettings,
} from '@/features/report/types/fastReportGps';

const DEFAULT_OFFSET_SETTINGS: FastReportOffsetSettings = {
  planimetric: {
    enabled: true,
    value: 0,
  },
  altimetric: {
    enabled: true,
    value: 0,
  },
};

function createDefaultOffsetSettings(): FastReportOffsetSettings {
  return {
    planimetric: { ...DEFAULT_OFFSET_SETTINGS.planimetric },
    altimetric: { ...DEFAULT_OFFSET_SETTINGS.altimetric },
  };
}

export const DEFAULT_FAST_REPORT_GPS_SETTINGS: FastReportGpsSettings = {
  offsetByMode: {
    pedestrian: createDefaultOffsetSettings(),
    car: createDefaultOffsetSettings(),
  },
  toleranceByMode: {
    pedestrian: TRACE_TOLERANCE,
    car: TRACE_TOLERANCE,
  },
};
