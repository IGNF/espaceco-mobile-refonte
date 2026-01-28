import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { SlideUpPage } from '@/shared/ui/SlideUpPage';
import { PageHeader } from '@/shared/ui/PageHeader';

import styles from './ReportFiltersPage.module.css';
import screen from '@/shared/styles/screen.module.css';
import typography from '@/shared/styles/typography.module.css';

export interface ReportFiltersPageProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReportFiltersPage({ isOpen, onClose }: ReportFiltersPageProps) {
  const { t } = useTranslation();

  const handleEraseFilters = () => {
    // TODO: Implement filter reset
    console.log('Erase filters');
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
      <SlideUpPage isOpen={isOpen} onClose={onClose} level={2} className={styles.filtersPage}>
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

          {/* Filter options will be added here */}
          <div className={styles.filterOptions}>
            <p className={styles.placeholder}>Filter options coming soon...</p>
          </div>

          <button
            className={styles.eraseButton}
            onClick={handleEraseFilters}
          >
            {t('reports.filters.eraseFilters')}
          </button>
        </main>
      </div>
    </SlideUpPage>
    </>
  );
}
