import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { CommunityThemeConfig } from '@/domain/community/models';
import { TraceToolbar } from '@/features/report/components/Trace/TraceToolbar';
import { useReportTraceSession } from '@/features/report/hooks/useReportTraceSession';
import { useSaveFastReportTrace } from '@/features/report/hooks/useSaveFastReportTrace';
import { formatTraceToolbarStatus } from '@/features/report/utils/traceStatus';
import { getLineStringGeometry } from '@/features/report/utils/traceGeometry';
import { showToastSafe } from '@/shared/utils/toast';
import type OlMap from 'ol/Map';

import styles from './FastReportGpsOverlay.module.css';

interface FastReportGpsOverlayProps {
  isOpen: boolean;
  map: OlMap;
  theme: CommunityThemeConfig;
  onClose: () => void;
  onChooseTheme: () => void;
}

export function FastReportGpsOverlay({
  isOpen,
  map,
  theme,
  onClose,
  onChooseTheme,
}: FastReportGpsOverlayProps) {
  const { t } = useTranslation();
  const {
    isRecording,
    isPaused,
    hasTrace,
    tracePointCount,
    traceDistanceMeters,
    transportMode,
    isAudioEnabled,
    startRecording,
    startRecordingFromCoordinate,
    togglePause,
    finalizeRecording,
    discardTrace,
    toggleTransportMode,
    toggleAudio,
  } = useReportTraceSession({
    map,
    enabled: isOpen,
  });
  const { isSaving, saveFastReportTrace } = useSaveFastReportTrace();

  const statusText = useMemo(() => {
    return formatTraceToolbarStatus(t, {
      isRecording,
      isPaused,
      hasTrace,
      pointCount: tracePointCount,
      distanceMeters: traceDistanceMeters,
    });
  }, [hasTrace, isPaused, isRecording, t, traceDistanceMeters, tracePointCount]);

  const saveTrace = async (continueRecording: boolean) => {
    const traceFeature = finalizeRecording().find((feature) => getLineStringGeometry(feature));
    if (!traceFeature) return;

    try {
      await saveFastReportTrace({
        map,
        theme,
        traceFeature,
      });

      await showToastSafe({
        text: t('reports.fastReport.gps.saveSuccess'),
        duration: 'short',
        position: 'top',
      });

      const lastCoordinate = getLineStringGeometry(traceFeature)?.getLastCoordinate();
      discardTrace();
      if (continueRecording && lastCoordinate) {
        startRecordingFromCoordinate(lastCoordinate);
      }
    } catch (error) {
      console.error('Failed to save fast report trace', error);
      await showToastSafe({
        text: t('reports.fastReport.gps.saveError'),
        duration: 'short',
        position: 'top',
      });
    }
  };

  const handleValidate = () => {
    void saveTrace(false);
  };

  const handleValidateAndContinue = () => {
    void saveTrace(true);
  };

  const handleCancel = () => {
    discardTrace();
    onClose();
  };

  const handleChooseTheme = () => {
    onChooseTheme();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.themePill}>{theme.theme}</div>
      <TraceToolbar
        variant="fastReport"
        isRecording={isRecording}
        isPaused={isPaused}
        hasTrace={hasTrace}
        canValidate={hasTrace && !isSaving}
        transportMode={transportMode}
        isAudioEnabled={isAudioEnabled}
        statusText={statusText}
        onStartRecording={startRecording}
        onTogglePause={togglePause}
        onToggleTransportMode={toggleTransportMode}
        onToggleAudio={toggleAudio}
        onValidate={handleValidate}
        onValidateAndContinue={handleValidateAndContinue}
        onChooseTheme={handleChooseTheme}
        onCancel={handleCancel}
      />
    </>
  );
}
