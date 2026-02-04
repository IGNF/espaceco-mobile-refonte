import { useState, useEffect, useCallback } from 'react';
import { ReportStatus } from '@ign/mobile-core';
import { ReportStorageAdapter } from '@/infra/storage';
import type { AppReport } from '@/domain/report/models';

interface UseMyReportsResult {
  reports: AppReport[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const reportStorage = new ReportStorageAdapter();

export function useMyReports(): UseMyReportsResult {
  const [reports, setReports] = useState<AppReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

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
      setReports(drafts as AppReport[]);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load draft reports'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return {
    reports,
    isLoading,
    error,
    refetch: fetchReports,
  };
}
