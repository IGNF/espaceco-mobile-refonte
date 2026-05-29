import { useCallback, useState } from 'react';

import type OlMap from 'ol/Map';

import { collabApiClient } from '@/infra/api';
import { ReportStorageAdapter } from '@/infra/storage/ReportStorageAdapter';

import type { AppReport } from '@/domain/report/models';

import { removeLocalReportFromMap } from '@/features/map/utils/signalementReportFeatures';
import { useSubmitReport } from '@/features/report/hooks/useSubmitReport';
import { removeSessionSentReports } from '@/features/report/state/sessionSentReportsStore';

const reportStorage = new ReportStorageAdapter();

interface UseMyReportsBulkActionsParams {
  draftReports: AppReport[];
  sentSessionReports: AppReport[];
  refetch: () => Promise<void>;
  map?: OlMap | null;
}

export function useMyReportsBulkActions({
  draftReports,
  sentSessionReports,
  refetch,
  map,
}: UseMyReportsBulkActionsParams) {
  const { submitReport, isSubmitting } = useSubmitReport();
  const [isSendingDrafts, setIsSendingDrafts] = useState(false);
  const [isDeletingReports, setIsDeletingReports] = useState(false);

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

  const deleteSentReportsFromServer = useCallback(async () => {
    for (const report of sentSessionReports) {
      await collabApiClient.report.delete(report.id);
    }
    removeSessionSentReports(sentSessionReports.map((report) => report.id));
  }, [sentSessionReports]);

  const deleteSentSessionReports = useCallback(async () => {
    setIsDeletingReports(true);
    try {
      await deleteSentReportsFromServer();
      await refetch();
    } finally {
      setIsDeletingReports(false);
    }
  }, [deleteSentReportsFromServer, refetch]);

  const deleteAllReports = useCallback(async () => {
    setIsDeletingReports(true);
    try {
      await deleteSentReportsFromServer();
      await deleteDraftReports();
      await refetch();
    } finally {
      setIsDeletingReports(false);
    }
  }, [deleteDraftReports, deleteSentReportsFromServer, refetch]);

  return {
    isSendingDrafts: isSendingDrafts || isSubmitting,
    isDeletingReports,
    isBulkActionRunning: isSendingDrafts || isSubmitting || isDeletingReports,
    sendDraftReports,
    deleteSentSessionReports,
    deleteAllReports,
  };
}
