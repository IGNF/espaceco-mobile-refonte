import { useTranslation } from 'react-i18next';
import type { ReportStatus } from '@ign/mobile-core';
import type { ReportFilters } from '@/domain/report/models';
import { getStatusColor } from '@/shared/utils/reportStatus';
import { formatDate } from '@/shared/utils/date';
import styles from './ActiveFilters.module.css';

export interface ActiveFiltersProps {
  filters: ReportFilters;
  onRemoveStatus: (status: ReportStatus) => void;
  onRemoveDate: () => void;
}

export function ActiveFilters({ filters, onRemoveStatus, onRemoveDate }: ActiveFiltersProps) {
  const { t } = useTranslation();

  const hasFilters = (filters.status && filters.status.length > 0) || filters.updating_date;
  if (!hasFilters) return null;

  return (
    <div className={styles.container}>
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
