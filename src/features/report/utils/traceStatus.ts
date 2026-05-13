import type { TFunction } from 'i18next';

interface FormatTraceStatusOptions {
  isRecording: boolean;
  isPaused: boolean;
  hasTrace: boolean;
  pointCount: number;
  distanceMeters: number;
}

export function formatTraceToolbarStatus(
  t: TFunction,
  {
    isRecording,
    isPaused,
    hasTrace,
    pointCount,
    distanceMeters,
  }: FormatTraceStatusOptions
): string {
  if (isRecording && !isPaused) {
    return t('reports.createOrEdit.traceToolbar.statusRecording', {
      pointCount,
      distance: distanceMeters,
    });
  }
  if (isRecording && isPaused) {
    return t('reports.createOrEdit.traceToolbar.statusPaused', {
      pointCount,
      distance: distanceMeters,
    });
  }
  if (hasTrace) {
    return t('reports.createOrEdit.traceToolbar.statusReady', {
      pointCount,
      distance: distanceMeters,
    });
  }
  return t('reports.createOrEdit.traceToolbar.statusIdle');
}
