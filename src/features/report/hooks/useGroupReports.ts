import { useState, useEffect, useCallback } from 'react';
import { collabApiClient } from '@/infra/api';
import { useCommunity } from '@/features/community/hooks/useCommunity';
import type { AppReport, ReportListRequestParams } from '@/domain/report/models';
import { mapApiReportsToAppReports, type ApiReportResponse } from '@/domain/report/mappers';

interface UseGroupReportsOptions {
  page?: number;
  limit?: number;
}

interface UseGroupReportsResult {
  reports: AppReport[];
  isLoading: boolean;
  error: Error | null;
  total: number;
  refetch: () => Promise<void>;
}

export function useGroupReports(options: UseGroupReportsOptions = {}): UseGroupReportsResult {
  const { page = 1, limit = 10 } = options; // 10 reports per page by default
  const { activeCommunity } = useCommunity();

  const [reports, setReports] = useState<AppReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);

  const fetchReports = useCallback(async () => {
    console.log('fetchReports', { page, limit }, 'activeCommunity', activeCommunity);
    if (!activeCommunity) {
      setReports([]);
      setTotal(0);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params: ReportListRequestParams = {
        communityId: activeCommunity.id,
        page,
        limit,
      };

      console.log('fetchReports => params', params);

      const response = await collabApiClient.report.getAll({
        communities: params.communityId,
      });

      console.log('fetchReports => response', response);

      const apiReports = response.data as ApiReportResponse[];
      const appReports = mapApiReportsToAppReports(apiReports);

      setReports(appReports);
      // Total count might be in headers or response metadata
      setTotal(appReports.length);
    } catch (err) {
      console.error('fetchReports => error', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch reports'));
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeCommunity, page, limit]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return {
    reports,
    isLoading,
    error,
    total,
    refetch: fetchReports,
  };
}
