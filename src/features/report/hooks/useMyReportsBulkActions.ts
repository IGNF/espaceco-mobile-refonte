import { useCallback, useState } from 'react';

import type OlMap from 'ol/Map';

import { ReportStorageAdapter } from '@/infra/storage/ReportStorageAdapter';

import type { AppReport } from '@/domain/report/models';

import { removeLocalReportFromMap } from '@/features/map/utils/signalementReportFeatures';
import { useSubmitReport } from '@/features/report/hooks/useSubmitReport';
import { clearSessionSentReports } from '@/features/report/state/sessionSentReportsStore';

const reportStorage = new ReportStorageAdapter();

interface UseMyReportsBulkActionsParams {
  draftReports: AppReport[];
  refetch: () => Promise<void>;
  map?: OlMap | null;
}

export function useMyReportsBulkActions({
  draftReports,
  refetch,
  map,
}: UseMyReportsBulkActionsParams) {
  const { submitReport, isSubmitting } = useSubmitReport();
  const [isSendingDrafts, setIsSendingDrafts] = useState(false);
  const [isClearingReports, setIsClearingReports] = useState(false);

  const sendDraftReports = useCallback(async () => {
    setIsSendingDrafts(true);
    try {
      for (const report of draftReports) {
        await submitReport(report);
      }
      await refetch();
    } finally {
      setIsSendingDrafts(false);
    }
  }, [draftReports, refetch, submitReport]);

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
    sendDraftReports,
    clearSentSessionReports,
    clearAllReports,
  };
}
