import { useTranslation } from 'react-i18next';

import { useBackHandler } from '@/shared/hooks/useBackHandler';
import { Button } from '@/shared/ui/Button';
import { Segment } from '@/shared/ui/Segment';

import IconArrowLeft from '@/shared/assets/icons/icon-arrow-left.svg?react';
import IconLine from '@/shared/assets/icons/icon-line.svg?react';
import IconPolygon from '@/shared/assets/icons/icon-polygon.svg?react';

import type { MeasureMode } from '@/features/map/utils/measureGeometry';

import styles from './MapMeasureBar.module.css';

const MEASURE_BACK_Z_INDEX = 30;

interface MapMeasureBarProps {
  mode: MeasureMode;
  isValidated: boolean;
  summary: string | null;
  canUndo: boolean;
  canValidate: boolean;
  onModeChange: (mode: MeasureMode) => void;
  onUndo: () => void;
  onValidate: () => void;
  onClose: () => void;
}

export function MapMeasureBar({
  mode,
  isValidated,
  summary,
  canUndo,
  canValidate,
  onModeChange,
  onUndo,
  onValidate,
  onClose,
}: MapMeasureBarProps) {
  const { t } = useTranslation();
  useBackHandler(true, onClose, MEASURE_BACK_Z_INDEX);

  return (
    <div className={styles.bar}>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={styles.undoButton}
          onClick={onUndo}
          disabled={!canUndo}
          aria-label={t('home.measure.undo')}
        >
          <IconArrowLeft className={styles.undoIcon} />
        </button>
        <Segment
          className={styles.modeSegment}
          ariaLabel={t('home.measure.open')}
          value={mode}
          onChange={onModeChange}
          options={[
            { value: 'length', label: t('home.measure.length'), icon: IconLine },
            { value: 'area', label: t('home.measure.area'), icon: IconPolygon },
          ]}
        />
      </div>
      <p className={styles.summary}>
        {summary ?? t('home.measure.hint')}
      </p>
      {isValidated ? (
        <p className={styles.validatedHint}>{t('home.measure.validatedHint')}</p>
      ) : (
        <Button type="button" fullWidth disabled={!canValidate} onClick={onValidate}>
          {t('home.measure.validate')}
        </Button>
      )}
    </div>
  );
}
