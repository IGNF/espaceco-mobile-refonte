import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import type OlMap from 'ol/Map';
import type { CommunityLayer } from '@ign/mobile-core';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCommunity } from '@/features/community/hooks/useCommunity';
import { useMyReports } from '@/features/report/hooks/useMyReports';
import { useMyReportsBulkActions } from '@/features/report/hooks/useMyReportsBulkActions';
import { ReportRow } from '@/features/report/components/Reports/ReportRow';
import { ReportDetailsPage } from '@/features/report/pages/ReportDetails/ReportDetailsPage';

import { SlideUpPage } from '@/shared/ui/SlideUpPage';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Button } from '@/shared/ui/Button';
import { Alert } from '@/shared/ui/Alert';
import { joinCSSClassNames } from '@/shared/utils/join';
import { showToastSafe } from '@/shared/utils/toast';

import type { AppReport } from '@/domain/report/models';

import screen from '@/shared/styles/screen.module.css';
import typography from "@/shared/styles/typography.module.css";
import stickyActions from '@/shared/styles/stickyActions.module.css';

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
  const { reports, draftReports, sentSessionReports, isLoading, error, refetch } = useMyReports();
  const [isDeleteChoiceOpen, setIsDeleteChoiceOpen] = useState(false);
  const [isDeleteAllConfirmOpen, setIsDeleteAllConfirmOpen] = useState(false);
  const {
    isSendingDrafts,
    isDeletingReports,
    isBulkActionRunning,
    sendDraftReports,
    deleteSentSessionReports,
    deleteAllReports,
  } = useMyReportsBulkActions({
    draftReports,
    sentSessionReports,
    refetch,
    map,
  });
  const hasReports = reports.length > 0;

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

  const handleOpenDeleteChoice = useCallback(() => {
    setIsDeleteChoiceOpen(true);
  }, []);

  const handleCloseDeleteChoice = useCallback(() => {
    setIsDeleteChoiceOpen(false);
  }, []);

  const handleCloseDeleteAllConfirm = useCallback(() => {
    setIsDeleteAllConfirmOpen(false);
  }, []);

  const handleDeleteSentSessionReports = useCallback(async () => {
    if (sentSessionReports.length === 0) {
      await showToastSafe({
        text: t('reports.myReports.deleteChoice.noSessionSentReports'),
        duration: 'short',
        position: 'top',
      });
      return;
    }

    await deleteSentSessionReports();
    setIsDeleteChoiceOpen(false);
  }, [deleteSentSessionReports, sentSessionReports.length, t]);

  const handleOpenDeleteAllConfirm = useCallback(() => {
    setIsDeleteChoiceOpen(false);
    setIsDeleteAllConfirmOpen(true);
  }, []);

  const handleDeleteAllReports = useCallback(async () => {
    await deleteAllReports();
    setIsDeleteAllConfirmOpen(false);
  }, [deleteAllReports]);

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

      <main
        className={joinCSSClassNames(
          screen.screenExtendedContainer,
          styles.content,
          user && hasReports && styles.contentWithActions
        )}
      >
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

      {user && hasReports ? (
        <footer className={joinCSSClassNames(stickyActions.bar, styles.actionsBar)}>
          <Button
            type="button"
            fullWidth
            onClick={() => void sendDraftReports()}
            disabled={draftReports.length === 0 || isBulkActionRunning}
            loading={isSendingDrafts}
          >
            {t('reports.myReports.actions.sendDrafts', { count: draftReports.length })}
          </Button>
          <Button
            type="button"
            fullWidth
            color="danger"
            onClick={handleOpenDeleteChoice}
            disabled={isBulkActionRunning}
          >
            {t('reports.myReports.actions.delete')}
          </Button>
        </footer>
      ) : null}

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

      <Alert
        isOpen={isDeleteChoiceOpen}
        onClose={handleCloseDeleteChoice}
        title={t('reports.myReports.deleteChoice.title')}
        buttons={[
          {
            label: t('reports.myReports.deleteChoice.sessionSentButton'),
            onClick: () => void handleDeleteSentSessionReports(),
            color: 'danger',
            variant: 'outline',
            disabled: isDeletingReports,
            loading: isDeletingReports,
          },
          {
            label: t('reports.myReports.deleteChoice.allButton'),
            onClick: handleOpenDeleteAllConfirm,
            color: 'danger',
            disabled: isDeletingReports,
          },
          {
            label: t('reports.myReports.deleteChoice.cancelButton'),
            onClick: handleCloseDeleteChoice,
            variant: 'outline',
            disabled: isDeletingReports,
          },
        ]}
      />

      <Alert
        isOpen={isDeleteAllConfirmOpen}
        onClose={handleCloseDeleteAllConfirm}
        title={t('reports.myReports.deleteAll.title')}
        subtitle={t('reports.myReports.deleteAll.message')}
        buttons={[
          {
            label: t('reports.myReports.deleteAll.confirmButton'),
            onClick: () => void handleDeleteAllReports(),
            color: 'danger',
            loading: isDeletingReports,
          },
          {
            label: t('reports.myReports.deleteAll.cancelButton'),
            onClick: handleCloseDeleteAllConfirm,
            variant: 'outline',
            disabled: isDeletingReports,
          },
        ]}
      />
    </SlideUpPage>
  );
}
