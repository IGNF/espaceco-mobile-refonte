import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useMyReports } from '@/features/report/hooks/useMyReports';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { SlideUpPage } from '@/shared/ui/SlideUpPage';
import { PageHeader } from '@/shared/ui/PageHeader';
import { ReportRow } from '@/features/report/components/Reports/ReportRow';
import { ReportDetailsPage } from '@/features/report/pages/ReportDetails/ReportDetailsPage';
import type { AppReport } from '@/domain/report/models';
import IconSearch from '@/shared/assets/icons/icon-search.svg?react';
import IconFilter from '@/shared/assets/icons/icon-filter.svg?react';

import styles from '../reportsListPage.module.css';
import screen from '@/shared/styles/screen.module.css';
import typography from "@/shared/styles/typography.module.css";

export interface MyReportsPageProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function MyReportsPage({ isOpen = true, onClose = () => { } }: MyReportsPageProps) {
  const { t } = useTranslation();
  const { user, isLoading: isUserLoading } = useAuth();
  const { reports, isLoading, isLoadingMore, error, hasMore, loadMore } = useMyReports();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState<AppReport | null>(null);

  // Ref for the sentinel element
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Set up scroll-based infinite loading
  useEffect(() => {
    if (!isOpen) return;

    const handleScroll = () => {
      const sentinel = sentinelRef.current;
      if (!sentinel || !hasMore || isLoadingMore || isLoading) return;

      const rect = sentinel.getBoundingClientRect();
      const isVisible = rect.top <= window.innerHeight + 200;

      if (isVisible) {
        loadMore();
      }
    };

    // Listen on window since SlideUpPage handles scroll at its level
    window.addEventListener('scroll', handleScroll, true);

    // Check immediately in case content is already scrolled or short
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, hasMore, isLoadingMore, isLoading, loadMore]);

  const handleReportClick = useCallback((report: AppReport) => {
    setSelectedReport(report);
  }, []);

  const handleDetailsBack = useCallback(() => {
    setSelectedReport(null);
  }, []);

  const handleDetailsClose = useCallback(() => {
    setSelectedReport(null);
    onClose();
  }, [onClose]);

  const handleSearch = () => {
    console.log('Search:', searchQuery);
    // TODO: Implement search
  };

  const handleFilter = () => {
    console.log('Filter clicked');
    // TODO: Open filter modal
  };

  const renderContent = () => {
    if (isUserLoading) {
      return <div className={styles.loading}>{t('reports.general.loading')}</div>;
    }

    if (!user) {
      return <div className={styles.empty}>{t('reports.myReports.notConnected')}</div>;
    }

    if (isLoading && reports.length === 0) {
      return <div className={styles.loading}>{t('reports.myReports.loadingReports')}</div>;
    }

    if (error && reports.length === 0) {
      return <div className={styles.error}>{t('reports.general.error')}: {error.message}</div>;
    }

    return (
      <>
        <p className={styles.count}>
          <strong>{reports.length} {reports.length === 1 ? t('reports.general.report_singular') : t('reports.general.report_plural')}</strong>
        </p>
        <div className={styles.reportList}>
          {reports.map((report) => (
            <ReportRow
              key={report.id}
              report={report}
              onClick={handleReportClick}
            />
          ))}

          {/* Sentinel element for infinite scroll */}
          <div ref={sentinelRef} className={styles.sentinel} />

          {/* Loading more indicator */}
          {isLoadingMore && (
            <div className={styles.loadingMore}>
              {t('reports.general.loading')}
            </div>
          )}

          {/* End of list message */}
          {!hasMore && reports.length > 0 && (
            <div className={styles.endOfList}>
              {t('reports.general.noMoreReports')}
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <SlideUpPage isOpen={isOpen} onClose={onClose}>
      <PageHeader
        title={t('reports.myReports.headerTitle')}
        subtitle={t('reports.myReports.headerSubtitle')}
        onClose={onClose}
      />

      <main className={screen.screenContainer + " " + styles.content}>
        <div className={styles.titleSection}>
          <h1 className={typography.title}>{t('reports.myReports.title')}</h1>
          <p className={typography.subtitle}>
            {t('reports.myReports.description')}
          </p>
        </div>
        <p className={typography.paragraph + " " + typography.textSmall}>
          <span className={typography.italic}>{t('reports.myReports.description2')}</span>
        </p>

        <div className={styles.searchSection}>
          <div className={styles.searchBar}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder={`${t('reports.filters.search')}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              className={styles.searchButton}
              onClick={handleSearch}
              aria-label={t('reports.filters.search')}
            >
              <IconSearch className={styles.searchIcon} />
            </button>
          </div>
          <button
            className={styles.filterButton}
            onClick={handleFilter}
            aria-label={t('reports.filters.filter')}
          >
            <IconFilter className={styles.filterIcon} />
            <span className={styles.filterLabel}>{t('reports.filters.filter')}</span>
          </button>
        </div>

        {renderContent()}
      </main>

      <ReportDetailsPage
        isOpen={selectedReport !== null}
        report={selectedReport}
        onBack={handleDetailsBack}
        onClose={handleDetailsClose}
      />
    </SlideUpPage>
  );
}
