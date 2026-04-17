import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import type { ReportStatus } from '@ign/mobile-core';

import { SlideUpPage } from '@/shared/ui/SlideUpPage';
import { PageHeader } from '@/shared/ui/PageHeader';

import { useGroupReports } from '@/features/report/hooks/useGroupReports';
import { useCommunity } from '@/features/community/hooks/useCommunity';
import { ReportRow } from '@/features/report/components/Reports/ReportRow';
import { ReportDetailsPage } from '@/features/report/pages/ReportDetails/ReportDetailsPage';
import { ReportFiltersPage } from '@/features/report/pages/ReportFilters/ReportFiltersPage';
import { ActiveFilters } from '@/features/report/components/ActiveFilters/ActiveFilters';

import { Loading } from '@/shared/ui/Loading';

import type { AppReport, ReportFilters } from '@/domain/report/models';

import IconFilter from '@/shared/assets/icons/icon-filter.svg?react';

import styles from '../reportsListPage.module.css';
import screen from '@/shared/styles/screen.module.css';
import typography from '@/shared/styles/typography.module.css';

export interface GroupReportsPageProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GroupReportsPage({ isOpen, onClose }: GroupReportsPageProps) {
  const { t } = useTranslation();
  const { activeCommunity, isLoading: isCommunityLoading } = useCommunity();
  const [filters, setFilters] = useState<ReportFilters>({});
  const { reports, isLoading, isLoadingMore, error, hasMore, loadMore } = useGroupReports({ filters });
  const [selectedReport, setSelectedReport] = useState<AppReport | null>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

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

  const handleFilter = () => {
    setIsFiltersOpen(true);
  };

  const handleFiltersClose = () => {
    setIsFiltersOpen(false);
  };

  const handleFiltersApply = useCallback((newFilters: ReportFilters) => {
    setFilters(newFilters);
  }, []);

  const handleRemoveStatus = useCallback((status: ReportStatus) => {
    setFilters(prev => {
      const next = { ...prev, status: prev.status?.filter(s => s !== status) };
      if (!next.status || next.status.length === 0) delete next.status;
      return next;
    });
  }, []);

  const handleRemoveDate = useCallback(() => {
    setFilters(prev => {
      const next = { ...prev };
      delete next.updating_date;
      return next;
    });
  }, []);

  const handleRemoveMyReportsOnly = useCallback(() => {
    setFilters(prev => {
      const next = { ...prev };
      delete next.myReportsOnly;
      return next;
    });
  }, []);

  const handleRemoveTheme = useCallback((theme: { community: number; theme: string }) => {
    setFilters(prev => {
      const next = { ...prev, themes: prev.themes?.filter(t => !(t.community === theme.community && t.theme === theme.theme)) };
      if (!next.themes || next.themes.length === 0) delete next.themes;
      return next;
    });
  }, []);

  const renderContent = () => {
    if (isCommunityLoading) {
      return <Loading label={t('reports.general.loading')} />;
    }

    if (!activeCommunity) {
      return <div className={styles.empty}>{t('reports.groupReports.noCommunitySelected')}</div>;
    }

    if (isLoading) {
      return <Loading label={t('reports.groupReports.loadingReports')} />;
    }

    if (error && reports.length === 0) {
      return <div className={styles.error}>{t('reports.general.error')}: {error.message}</div>;
    }

    return (
      <>
        <div className={styles.countAndActionsWrapper}>
          <p className={styles.count}>
            <strong>{reports.length} {reports.length === 1 ? t('reports.general.report_singular') : t('reports.general.report_plural')}</strong>
          </p>
          <button
            className={styles.filterButton}
            onClick={handleFilter}
            aria-label={t('reports.general.filter')}
          >
            <IconFilter className={styles.filterIcon} />
            <span className={styles.filterLabel}>{t('reports.general.filter')}</span>
          </button>
        </div>
        <ActiveFilters
          filters={filters}
          onRemoveStatus={handleRemoveStatus}
          onRemoveDate={handleRemoveDate}
          onRemoveMyReportsOnly={handleRemoveMyReportsOnly}
          onRemoveTheme={handleRemoveTheme}
        />
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
            <Loading size="small" />
          )}

          {/* End of list message */}
          {!hasMore && reports.length > 0 && (
            <div className={styles.endOfList}>
              {t('reports.groupReports.noMoreReports')}
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <SlideUpPage isOpen={isOpen} onClose={onClose}>
      <PageHeader
        title={t('reports.groupReports.headerTitle')}
        subtitle={activeCommunity?.name || t('reports.groupReports.headerSubtitle')}
        onClose={onClose}
      />

      <main className={`${screen.screenContainer} ${styles.content}`}>
        <div className={styles.titleSection}>
          <h1 className={typography.title}>{t('reports.groupReports.title')}</h1>
          <p className={typography.subtitle}>
            {t('reports.groupReports.description')} {activeCommunity?.name || ''}
          </p>
        </div>

        {renderContent()}
      </main>

      <ReportDetailsPage
        isOpen={selectedReport !== null}
        report={selectedReport}
        onBack={handleDetailsBack}
        onClose={handleDetailsClose}
        onReplySuccess={(updatedReport) => setSelectedReport(updatedReport)}
      />

      <ReportFiltersPage
        isOpen={isFiltersOpen}
        filters={filters}
        onApply={handleFiltersApply}
        onClose={handleFiltersClose}
      />
    </SlideUpPage>
  );
}
