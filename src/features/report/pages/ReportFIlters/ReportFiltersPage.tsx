import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { ReportStatus } from '@ign/mobile-core';
import { SlideUpPage } from '@/shared/ui/SlideUpPage';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Button } from '@/shared/ui/Button';
import type { ReportFilters } from '@/domain/report/models';
import { getStatusColor } from '@/shared/utils/reportStatus';

import styles from './ReportFiltersPage.module.css';
import screen from '@/shared/styles/screen.module.css';
import typography from '@/shared/styles/typography.module.css';

const FILTER_STATUSES = [
  ReportStatus.Valid,
  ReportStatus.Submit,
  ReportStatus.Pending,
  ReportStatus.Reject,
] as const;

export interface ReportFiltersPageProps {
  isOpen: boolean;
  filters: ReportFilters;
  onApply: (filters: ReportFilters) => void;
  onClose: () => void;
}

export function ReportFiltersPage({ isOpen, filters, onApply, onClose }: ReportFiltersPageProps) {
  const { t } = useTranslation();

  const [selectedStatuses, setSelectedStatuses] = useState<ReportStatus[]>(
    filters.status ?? []
  );
  const [updatingDate, setUpdatingDate] = useState<string>(
    filters.updating_date ?? ''
  );
  const [prevFilters, setPrevFilters] = useState(filters);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  // Sync local state when the modal opens or filters change (React 19 pattern)
  if (isOpen && (!prevIsOpen || filters !== prevFilters)) {
    setPrevFilters(filters);
    setPrevIsOpen(isOpen);
    setSelectedStatuses(filters.status ?? []);
    setUpdatingDate(filters.updating_date ?? '');
  }

  if (!isOpen && prevIsOpen) {
    setPrevIsOpen(isOpen);
  }

  const toggleStatus = (status: ReportStatus) => {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const handleEraseFilters = () => {
    setSelectedStatuses([]);
    setUpdatingDate('');
    onApply({});
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleApply = () => {
    const newFilters: ReportFilters = {};
    if (selectedStatuses.length > 0) {
      newFilters.status = selectedStatuses;
    }
    if (updatingDate) {
      newFilters.updating_date = updatingDate;
    }
    onApply(newFilters);
    onClose();
  };

  const overlay = isOpen ? createPortal(
    <div
      className={`${screen.overlay} ${styles.overlay}`}
      onClick={onClose}
      aria-hidden="true"
    />,
    document.body
  ) : null;

  return (
    <>
      {overlay}
      <SlideUpPage
        isOpen={isOpen}
        onClose={onClose}
        level={2}
        className={styles.filtersPage}
        fullPage={false}
      >
        <div className={styles.filtersContainer}>
          <PageHeader
            title={t('reports.filters.headerTitle')}
            subtitle={t('reports.filters.headerSubtitle')}
            onClose={onClose}
          />

          <main className={screen.screenContainer + " " + styles.content}>
            <div className={styles.titleSection}>
              <h1 className={typography.title}>{t('reports.filters.title')}</h1>
              <p className={typography.subtitle}>
                {t('reports.filters.description')}
              </p>
            </div>

            <div className={styles.filterOptions}>
              {/* Status filter */}
              <div className={styles.filterGroup}>
                <h2 className={styles.filterLabel}>{t('reports.filters.status')}</h2>
                <div className={styles.statusList}>
                  {FILTER_STATUSES.map(status => {
                    const isSelected = selectedStatuses.includes(status);
                    return (
                      <button
                        key={status}
                        type="button"
                        className={`${styles.statusPill} ${isSelected ? styles.statusPillActive : ''}`}
                        onClick={() => toggleStatus(status)}
                      >
                        <span
                          className={styles.statusDot + " " + (isSelected ? styles.statusDotActive : '')}
                          style={{ backgroundColor: getStatusColor(status) }}
                        />
                        {t(`reports.filters.statusOptions.${status}`)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Update date filter */}
              <div className={styles.filterGroup}>
                <h2 className={styles.filterLabel}>{t('reports.filters.updatedAt')}</h2>
                <input
                  type="date"
                  className={styles.dateInput}
                  value={updatingDate}
                  onChange={e => setUpdatingDate(e.target.value)}
                  placeholder={t('reports.filters.datePlaceholder')}
                />
              </div>
            </div>

            <div className={styles.actions}>
              <Button color="primary" fullWidth onClick={handleApply}>
                {t('reports.filters.applyFilters')}
              </Button>

              <Button
                color="danger"
                variant="outline"
                fullWidth
                onClick={handleEraseFilters}
              >
                {t('reports.filters.eraseFilters')}
              </Button>
            </div>
          </main>
        </div>
      </SlideUpPage>
    </>
  );
}
