import { useState, useEffect, useCallback, useMemo } from 'react';

import { ReportStatus } from '@ign/mobile-core';

import { ReportStorageAdapter } from '@/infra/storage';

import type { AppReport } from '@/domain/report/models';
import { useSessionSentReports } from '@/features/report/state/sessionSentReportsStore';

interface UseMyReportsResult {
  reports: AppReport[];
  draftReports: AppReport[];
  sentSessionReports: AppReport[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const reportStorage = new ReportStorageAdapter();

export function useMyReports(): UseMyReportsResult {
  const [draftReports, setDraftReports] = useState<AppReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const sentSessionReports = useSessionSentReports();

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const allReports = await reportStorage.listReports();
      const drafts = allReports.filter(r => r.status === ReportStatus.Draft);
      // Sort by most recently modified first
      drafts.sort((a, b) => {
        const dateA = a.modifiedAt ?? a.createdAt;
        const dateB = b.modifiedAt ?? b.createdAt;
        return dateB.getTime() - dateA.getTime();
      });
      setDraftReports(drafts as AppReport[]);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load draft reports'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const reports = useMemo(() => {
    const sentReportIds = new Set(sentSessionReports.map(report => report.id));
    return [
      ...sentSessionReports,
      ...draftReports.filter(report => !sentReportIds.has(report.id)),
    ];
  }, [draftReports, sentSessionReports]);

  return {
    reports,
    draftReports,
    sentSessionReports,
    isLoading,
    error,
    refetch: fetchReports,
  };
}
