import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import type OlMap from 'ol/Map';
import type { CommunityLayer } from '@ign/mobile-core';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCommunity } from '@/features/community/hooks/useCommunity';
import { useMyReports } from '@/features/report/hooks/useMyReports';
import { ReportRow } from '@/features/report/components/Reports/ReportRow';
import { ReportDetailsPage } from '@/features/report/pages/ReportDetails/ReportDetailsPage';

import { SlideUpPage } from '@/shared/ui/SlideUpPage';
import { PageHeader } from '@/shared/ui/PageHeader';

import type { AppReport } from '@/domain/report/models';

import screen from '@/shared/styles/screen.module.css';
import typography from "@/shared/styles/typography.module.css";

import styles from '../reportsListPage.module.css';

export interface MyReportsPageProps {
  isOpen?: boolean;
  onClose?: () => void;
  map?: OlMap | null;
  vectorLayers?: CommunityLayer[];
  onSearchPanelVisibilityChange?: (isVisible: boolean) => void;
  onMapPickerActiveChange?: (isActive: boolean) => void;
}

export function MyReportsPage({
  isOpen = true,
  onClose = () => { },
  map,
  vectorLayers,
  onSearchPanelVisibilityChange,
  onMapPickerActiveChange,
}: MyReportsPageProps) {
  const { t } = useTranslation();
  const { user, isLoading: isUserLoading } = useAuth();
  const { communities, activeCommunity } = useCommunity();
  const { reports, isLoading, error, refetch } = useMyReports();

  useEffect(() => {
    if (isOpen) {
      refetch();
    }
  }, [isOpen, refetch]);

  const getCommunityName = useCallback((communityId: number): string | undefined => {
    const community = communities.find(c => c.id === communityId);
    return community?.name;
  }, [communities]);

  const [selectedReport, setSelectedReport] = useState<AppReport | null>(null);
  const selectedReportIndex = selectedReport
    ? reports.findIndex((report) => report.id === selectedReport.id)
    : -1;
  const hasPreviousReport = selectedReportIndex > 0;
  const hasNextReport = selectedReportIndex >= 0 && selectedReportIndex < reports.length - 1;

  const handleReportClick = useCallback((report: AppReport) => {
    setSelectedReport(report);
  }, []);

  const handlePreviousReport = useCallback(() => {
    setSelectedReport(reports[selectedReportIndex - 1]);
  }, [reports, selectedReportIndex]);

  const handleNextReport = useCallback(() => {
    setSelectedReport(reports[selectedReportIndex + 1]);
  }, [reports, selectedReportIndex]);

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
    <SlideUpPage
      isOpen={isOpen}
      onClose={onClose}
      className={selectedReport ? styles.hiddenBehindChild : undefined}
    >
      <PageHeader
        title={t('reports.myReports.headerTitle')}
        subtitle={activeCommunity?.name ?? t('reports.myReports.headerSubtitle')}
        onClose={onClose}
      />

      <main className={screen.screenExtendedContainer + " " + styles.content}>
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
        map={map}
        vectorLayers={vectorLayers}
        onSearchPanelVisibilityChange={onSearchPanelVisibilityChange}
        onMapPickerActiveChange={onMapPickerActiveChange}
        hasPreviousReport={hasPreviousReport}
        hasNextReport={hasNextReport}
        onPreviousReport={hasPreviousReport ? handlePreviousReport : undefined}
        onNextReport={hasNextReport ? handleNextReport : undefined}
      />
    </SlideUpPage>
  );
}
