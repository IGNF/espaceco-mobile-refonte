import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type OlMap from 'ol/Map';

import { ReportStorageAdapter } from '@/infra/storage/ReportStorageAdapter';

import type { AppReport } from '@/domain/report/models';

import { removeLocalReportFromMap } from '@/features/map/utils/signalementReportFeatures';
import { useSubmitReport } from '@/features/report/hooks/useSubmitReport';
import type { ReportSubmitError } from '@/features/report/errors/reportSubmitError';
import { clearSessionSentReports } from '@/features/report/state/sessionSentReportsStore';
import { getUserFacingErrorMessage } from '@/shared/errors/appError';

const reportStorage = new ReportStorageAdapter();

interface UseMyReportsBulkActionsParams {
  draftReports: AppReport[];
  refetch: () => Promise<void>;
  map?: OlMap | null;
}

export interface BulkReportSendFailure {
  reportId: number;
  message: string;
}

export function useMyReportsBulkActions({
  draftReports,
  refetch,
  map,
}: UseMyReportsBulkActionsParams) {
  const { t } = useTranslation();
  const { submitReport, isSubmitting } = useSubmitReport();
  const [isSendingDrafts, setIsSendingDrafts] = useState(false);
  const [isClearingReports, setIsClearingReports] = useState(false);
  const [sendFailures, setSendFailures] = useState<BulkReportSendFailure[]>([]);

  const sendDraftReports = useCallback(async () => {
    setIsSendingDrafts(true);
    setSendFailures([]);
    const nextSendFailures: BulkReportSendFailure[] = [];

    try {
      for (const report of draftReports) {
        await submitReport(report, {
          showErrorToast: false,
          onError: (error: ReportSubmitError) => {
            nextSendFailures.push({
              reportId: report.id,
              message: getUserFacingErrorMessage(error, t, error.translationKey),
            });
          },
        });
      }
      setSendFailures(nextSendFailures);
      await refetch();
    } finally {
      setIsSendingDrafts(false);
    }
  }, [draftReports, refetch, submitReport, t]);

  const deleteDraftReports = useCallback(async () => {
    for (const report of draftReports) {
      await reportStorage.deleteReport(report.id);
      if (map) {
        removeLocalReportFromMap(map, report.id);
      }
    }
  }, [draftReports, map]);

  const clearSentSessionReports = useCallback(async () => {
    setIsClearingReports(true);
    try {
      await clearSessionSentReports();
      await refetch();
    } finally {
      setIsClearingReports(false);
    }
  }, [refetch]);

  const clearAllReports = useCallback(async () => {
    setIsClearingReports(true);
    try {
      await clearSessionSentReports();
      await deleteDraftReports();
      await refetch();
    } finally {
      setIsClearingReports(false);
    }
  }, [deleteDraftReports, refetch]);

  return {
    isSendingDrafts: isSendingDrafts || isSubmitting,
    isClearingReports,
    isBulkActionRunning: isSendingDrafts || isSubmitting || isClearingReports,
    sendFailures,
    sendDraftReports,
    clearSentSessionReports,
    clearAllReports,
  };
}
