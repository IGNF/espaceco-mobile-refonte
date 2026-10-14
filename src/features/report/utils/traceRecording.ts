import type { RecordingInterval } from '@/features/report/types/fastReportGps';

export interface TracePointRecordingRule {
  minDistanceMeters: number;
  recordingInterval?: RecordingInterval;
}

/**
 * A fix becomes a geometry vertex when it clears the minimum distance
 * and, when set, the recording interval. The first fix of a trace is kept.
 */
export function shouldRecordTracePoint(
  rule: TracePointRecordingRule,
  distanceMeters: number,
  elapsedSeconds: number,
  isFirstPoint: boolean,
): boolean {
  if (isFirstPoint) return true;
  if (distanceMeters < rule.minDistanceMeters) return false;

  const recordingInterval = rule.recordingInterval;
  if (!recordingInterval) return true;
  if (recordingInterval.unit === 'meters') {
    return distanceMeters >= recordingInterval.value;
  }
  return elapsedSeconds >= recordingInterval.value;
}
