import { useTranslation } from 'react-i18next';
import type { TraceTransportMode } from '@/features/report/constants/reportTrace.constants';

import IconPause from '@/shared/assets/icons/icon-pause.svg?react';
import IconPlay from '@/shared/assets/icons/icon-play.svg?react';
import IconCheck from '@/shared/assets/icons/icon-check.svg?react';
import IconClose from '@/shared/assets/icons/icon-close.svg?react';
import IconSpeaker from '@/shared/assets/icons/icon-speaker.svg?react';
import IconCar from '@/shared/assets/icons/Icon-car.svg?react';
import IconPedestrian from '@/shared/assets/icons/Icon-pedestrain.svg?react';
import { joinCSSClassNames } from '@/shared/utils/join';

import styles from './TraceToolbar.module.css';

interface TraceToolbarProps {
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
  onCancel: () => void;
}

export function TraceToolbar({
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
  onCancel,
}: TraceToolbarProps) {
  const { t } = useTranslation();

  const isPauseDisabled = !isRecording;
  const canResume = isRecording && isPaused;
  const isCarMode = transportMode === 'car';

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

      <div className={styles.bottomBar}>
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

        <button
          type="button"
          className={joinCSSClassNames(styles.actionButton, styles.validateButton)}
          onClick={onValidate}
          disabled={!canValidate}
          aria-label={t('reports.createOrEdit.traceToolbar.validate')}
        >
          <IconCheck className={styles.actionIcon} />
        </button>

        <button
          type="button"
          className={joinCSSClassNames(styles.actionButton, styles.cancelButton)}
          onClick={onCancel}
          aria-label={t('reports.createOrEdit.traceToolbar.cancel')}
        >
          <IconClose className={styles.actionIcon} />
        </button>
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
