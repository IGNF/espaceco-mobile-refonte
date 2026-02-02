import { useTranslation } from 'react-i18next';
import type { ReportStatus } from '@ign/mobile-core';
import type { ReportFilters, ThemeFilter } from '@/domain/report/models';
import { getStatusColor } from '@/shared/utils/reportStatus';
import { formatDate } from '@/shared/utils/date';
import styles from './ActiveFilters.module.css';

export interface ActiveFiltersProps {
  filters: ReportFilters;
  onRemoveStatus: (status: ReportStatus) => void;
  onRemoveDate: () => void;
  onRemoveMyReportsOnly?: () => void;
  onRemoveTheme?: (theme: ThemeFilter) => void;
}

export function ActiveFilters({ filters, onRemoveStatus, onRemoveDate, onRemoveMyReportsOnly, onRemoveTheme }: ActiveFiltersProps) {
  const { t } = useTranslation();

  const hasFilters =
    (filters.status && filters.status.length > 0) ||
    filters.updating_date ||
    filters.myReportsOnly ||
    (filters.themes && filters.themes.length > 0);

  if (!hasFilters) return null;

  return (
    <div className={styles.container}>
      {filters.myReportsOnly && (
        <button
          type="button"
          className={styles.chip}
          onClick={onRemoveMyReportsOnly}
        >
          <span className={styles.label}>
            {t('reports.filters.myReportsOnly')}
          </span>
          <span className={styles.close} aria-label="Remove">&times;</span>
        </button>
      )}

      {filters.themes?.map(tf => (
        <button
          key={`${tf.community}:${tf.theme}`}
          type="button"
          className={styles.chip}
          onClick={() => onRemoveTheme?.(tf)}
        >
          <span className={styles.label}>{tf.theme}</span>
          <span className={styles.close} aria-label="Remove">&times;</span>
        </button>
      ))}

      {filters.status?.map(status => (
        <button
          key={status}
          type="button"
          className={styles.chip}
          onClick={() => onRemoveStatus(status)}
        >
          <span
            className={styles.dot}
            style={{ backgroundColor: getStatusColor(status) }}
          />
          <span className={styles.label}>
            {t(`reports.filters.statusOptions.${status}`)}
          </span>
          <span className={styles.close} aria-label="Remove">&times;</span>
        </button>
      ))}

      {filters.updating_date && (
        <button
          type="button"
          className={styles.chip}
          onClick={onRemoveDate}
        >
          <span className={styles.label}>
            {formatDate(new Date(filters.updating_date))}
          </span>
          <span className={styles.close} aria-label="Remove">&times;</span>
        </button>
      )}
    </div>
  );
}
