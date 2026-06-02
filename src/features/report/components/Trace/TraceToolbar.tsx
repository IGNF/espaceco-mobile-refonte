import { useTranslation } from 'react-i18next';
import type { FastReportGpsInfo } from '@/features/report/types/fastReportGps';
import type { TraceTransportMode } from '@/features/report/constants/reportTrace.constants';

import IconPause from '@/shared/assets/icons/icon-pause.svg?react';
import IconPlay from '@/shared/assets/icons/icon-play.svg?react';
import IconCheck from '@/shared/assets/icons/icon-check.svg?react';
import IconClose from '@/shared/assets/icons/icon-close.svg?react';
import IconMenu from '@/shared/assets/icons/icon-menu.svg?react';
import IconMeasure from '@/shared/assets/icons/icon-mesure.svg?react';
import IconNext from '@/shared/assets/icons/icon-next.svg?react';
import IconSpeaker from '@/shared/assets/icons/icon-speaker.svg?react';
import IconCar from '@/shared/assets/icons/Icon-car.svg?react';
import IconPedestrian from '@/shared/assets/icons/Icon-pedestrain.svg?react';
import { joinCSSClassNames } from '@/shared/utils/join';

import styles from './TraceToolbar.module.css';

interface TraceToolbarProps {
  variant?: 'reportTrace' | 'fastReport';
  isRecording: boolean;
  isPaused: boolean;
  hasTrace: boolean;
  canValidate: boolean;
  transportMode: TraceTransportMode;
  isAudioEnabled: boolean;
  statusText: string;
  onStartRecording: () => void;
  onTogglePause: () => void;
  onToggleTransportMode: () => void;
  onToggleAudio: () => void;
  onValidate: () => void;
  onValidateAndContinue?: () => void;
  onChooseTheme?: () => void;
  onOpenOffsetSettings?: () => void;
  onCancel: () => void;
  gpsInfo?: FastReportGpsInfo | null;
}

export function TraceToolbar({
  variant = 'reportTrace',
  isRecording,
  isPaused,
  hasTrace,
  canValidate,
  transportMode,
  isAudioEnabled,
  statusText,
  onStartRecording,
  onTogglePause,
  onToggleTransportMode,
  onToggleAudio,
  onValidate,
  onValidateAndContinue,
  onChooseTheme,
  onOpenOffsetSettings,
  onCancel,
  gpsInfo = null,
}: TraceToolbarProps) {
  const { t } = useTranslation();

  const isPauseDisabled = !isRecording;
  const canResume = isRecording && isPaused;
  const isCarMode = transportMode === 'car';
  const isFastReport = variant === 'fastReport';
  const fastRecordLabel = !isRecording
    ? t('reports.createOrEdit.traceToolbar.start')
    : canResume
      ? t('reports.createOrEdit.traceToolbar.resume')
      : t('reports.createOrEdit.traceToolbar.pause');
  const transportButton = (
    <button
      type="button"
      className={joinCSSClassNames(styles.actionButton, isCarMode && styles.actionButtonActive)}
      onClick={onToggleTransportMode}
      aria-label={isCarMode
        ? t('reports.createOrEdit.traceToolbar.switchToPedestrian')
        : t('reports.createOrEdit.traceToolbar.switchToCar')}
    >
      {isCarMode ? (
        <IconCar className={styles.actionIcon} />
      ) : (
        <IconPedestrian className={styles.actionIcon} />
      )}
    </button>
  );

  return (
    <div className={styles.root}>
      <button
        type="button"
        className={joinCSSClassNames(styles.audioButton, !isAudioEnabled && styles.audioButtonMuted)}
        onClick={onToggleAudio}
        aria-label={isAudioEnabled
          ? t('reports.createOrEdit.traceToolbar.disableAudio')
          : t('reports.createOrEdit.traceToolbar.enableAudio')}
      >
        <IconSpeaker className={styles.audioIcon} />
      </button>

      {gpsInfo && (
        <div className={styles.gpsInfoBar}>
          <span
            className={joinCSSClassNames(styles.gpsQuality, styles[`gpsQuality-${gpsInfo.quality}`])}
            aria-label={t(`reports.createOrEdit.traceToolbar.gpsQuality.${gpsInfo.quality}`)}
          />
          <span>{t('reports.createOrEdit.traceToolbar.pdop', { value: gpsInfo.pdop ?? '-' })}</span>
          <span>{t('reports.createOrEdit.traceToolbar.heading', { value: gpsInfo.heading ?? '-' })}</span>
          <span>{gpsInfo.battery}</span>
        </div>
      )}

      <div className={joinCSSClassNames(styles.bottomBar, isFastReport && styles.bottomBarFastReport)}>
        {isFastReport ? (
          <button
            type="button"
            className={joinCSSClassNames(
              styles.actionButton,
              styles.recordButton,
              isRecording && !isPaused && styles.recordButtonRecording,
              canResume && styles.actionButtonActive
            )}
            onClick={isRecording ? onTogglePause : onStartRecording}
            aria-label={fastRecordLabel}
          >
            {!isRecording ? (
              <span className={styles.recordDot} />
            ) : canResume ? (
              <IconPlay className={styles.actionIcon} />
            ) : (
              <IconPause className={styles.actionIcon} />
            )}
          </button>
        ) : (
          <button
            type="button"
            className={joinCSSClassNames(
              styles.actionButton,
              styles.recordButton,
              isRecording && !isPaused && styles.actionButtonActive
            )}
            onClick={onStartRecording}
            aria-label={t('reports.createOrEdit.traceToolbar.start')}
          >
            <span className={styles.recordDot} />
          </button>
        )}

        {!isFastReport && (
          <button
            type="button"
            className={joinCSSClassNames(
              styles.actionButton,
              styles.pauseButton,
              canResume && styles.actionButtonActive
            )}
            onClick={onTogglePause}
            disabled={isPauseDisabled}
            aria-label={canResume
              ? t('reports.createOrEdit.traceToolbar.resume')
              : t('reports.createOrEdit.traceToolbar.pause')}
          >
            {canResume ? (
              <IconPlay className={styles.actionIcon} />
            ) : (
              <IconPause className={styles.actionIcon} />
            )}
          </button>
        )}

        {!isFastReport && transportButton}

        <button
          type="button"
          className={joinCSSClassNames(
            styles.actionButton,
            styles.validateButton,
            canValidate && styles.validateButtonReady
          )}
          onClick={onValidate}
          disabled={!canValidate}
          aria-label={t('reports.createOrEdit.traceToolbar.validate')}
        >
          <IconCheck className={styles.actionIcon} />
        </button>

        {isFastReport && (
          <button
            type="button"
            className={joinCSSClassNames(styles.actionButton, styles.validateButton)}
            onClick={onValidateAndContinue}
            disabled={!canValidate || !onValidateAndContinue}
            aria-label={t('reports.createOrEdit.traceToolbar.validateAndContinue')}
          >
            <IconNext className={styles.actionIcon} />
          </button>
        )}

        <button
          type="button"
          className={joinCSSClassNames(styles.actionButton, styles.cancelButton)}
          onClick={onCancel}
          aria-label={t('reports.createOrEdit.traceToolbar.cancel')}
        >
          <IconClose className={styles.actionIcon} />
        </button>

        {isFastReport && onChooseTheme && (
          <button
            type="button"
            className={styles.actionButton}
            onClick={onChooseTheme}
            aria-label={t('reports.createOrEdit.traceToolbar.chooseTheme')}
          >
            <IconMenu className={styles.actionIcon} />
          </button>
        )}

        {isFastReport && transportButton}

        {isFastReport && (
          <button
            type="button"
            className={styles.actionButton}
            onClick={onOpenOffsetSettings}
            disabled={!onOpenOffsetSettings}
            aria-label={t('reports.createOrEdit.traceToolbar.offsetSettings')}
          >
            <IconMeasure className={styles.actionIcon} />
          </button>
        )}
      </div>

      <div className={styles.statusPill}>
        <span>{statusText}</span>
        {hasTrace && (
          <span className={styles.statusDot} aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
