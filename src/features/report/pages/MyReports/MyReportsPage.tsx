import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useMyReports } from '@/features/report/hooks/useMyReports';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCommunity } from '@/features/community/hooks/useCommunity';
import { SlideUpPage } from '@/shared/ui/SlideUpPage';
import { PageHeader } from '@/shared/ui/PageHeader';
import { ReportRow } from '@/features/report/components/Reports/ReportRow';
import { ReportDetailsPage } from '@/features/report/pages/ReportDetails/ReportDetailsPage';
import type { AppReport } from '@/domain/report/models';

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
  const { communities } = useCommunity();
  const { reports, isLoading, error, refetch } = useMyReports();

  const getCommunityName = useCallback((communityId: number): string | undefined => {
    const community = communities.find(c => c.id === communityId);
    return community?.name;
  }, [communities]);

  const [selectedReport, setSelectedReport] = useState<AppReport | null>(null);

  const handleReportClick = useCallback((report: AppReport) => {
    setSelectedReport(report);
  }, []);

  const handleEditBack = useCallback(() => {
    setSelectedReport(null);
    refetch();
  }, [refetch]);

  const handleEditClose = useCallback(() => {
    setSelectedReport(null);
    refetch();
    onClose();
  }, [onClose, refetch]);

  const renderContent = () => {
    if (isUserLoading) {
      return <div className={styles.loading}>{t('reports.general.loading')}</div>;
    }

    if (!user) {
      return <div className={styles.empty}>{t('reports.myReports.notConnected')}</div>;
    }

    if (isLoading) {
      return <div className={styles.loading}>{t('reports.myReports.loadingReports')}</div>;
    }

    if (error) {
      return <div className={styles.error}>{t('reports.general.error')}: {error.message}</div>;
    }

    if (reports.length === 0) {
      return <div className={styles.empty}>{t('reports.myReports.noReports')}</div>;
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
              communityName={getCommunityName(report.communityId)}
              onClick={handleReportClick}
            />
          ))}
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

        {renderContent()}
      </main>

      <ReportDetailsPage
        isOpen={selectedReport !== null}
        report={selectedReport}
        onBack={handleEditBack}
        onClose={handleEditClose}
      />
    </SlideUpPage>
  );
}
