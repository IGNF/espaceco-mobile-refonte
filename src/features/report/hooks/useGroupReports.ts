import { useState, useEffect, useCallback, useRef } from 'react';
import { collabApiClient } from '@/infra/api';
import { useCommunity } from '@/features/community/hooks/useCommunity';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { AppReport, ReportFilters } from '@/domain/report/models';
import { mapApiReportsToAppReports, type ApiReportResponse } from '@/domain/report/mappers';

interface UseGroupReportsOptions {
  limit?: number;
  filters?: ReportFilters;
}

interface UseGroupReportsResult {
  reports: AppReport[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
}

export function useGroupReports(options: UseGroupReportsOptions = {}): UseGroupReportsResult {
  const { limit = 10, filters } = options;
  const { activeCommunity } = useCommunity();
  const { user } = useAuth();

  const [reports, setReports] = useState<AppReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Track current page for pagination (starts at 1)
  const pageRef = useRef(1);
  // Track loading state synchronously to prevent duplicate requests
  const isLoadingRef = useRef(false);
  const hasMoreRef = useRef(true);

  const fetchReports = useCallback(async (page: number, append: boolean = false) => {
    if (!activeCommunity) {
      setReports([]);
      setHasMore(false);
      hasMoreRef.current = false;
      return;
    }

    // Set loading ref immediately to prevent duplicate calls
    isLoadingRef.current = true;

    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const params: Record<string, any> = {
        communities: activeCommunity.id,
        page,
        limit,
      };

      if (filters?.status && filters.status.length > 0) {
        params.status = filters.status.join(',');
      }
      if (filters?.updating_date) {
        params.updating_date = filters.updating_date;
      }
      if (filters?.myReportsOnly && user) {
        params.author = user.id;
      }
      if (filters?.themes && filters.themes.length > 0) {
        params.attributes = JSON.stringify(filters.themes);
      }

      const response = await collabApiClient.report.getAll(params);

      const apiReports = response.data as ApiReportResponse[];
      const appReports = mapApiReportsToAppReports(apiReports);

      // Check if we received fewer reports than requested (means no more data)
      const receivedLessThanLimit = appReports.length < limit;
      setHasMore(!receivedLessThanLimit);
      hasMoreRef.current = !receivedLessThanLimit;

      if (append) {
        setReports(prev => [...prev, ...appReports]);
      } else {
        setReports(appReports);
      }

      // Update page for next request
      pageRef.current = page + 1;

    } catch (err) {
      console.error('fetchReports => error', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch reports'));
      if (!append) {
        setReports([]);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      isLoadingRef.current = false;
    }
  }, [activeCommunity, user, limit, filters]);

  // Initial fetch when community or filters change
  useEffect(() => {
    pageRef.current = 1;
    hasMoreRef.current = true;
    setHasMore(true);
    fetchReports(1, false);
  }, [fetchReports]);

  const loadMore = useCallback(async () => {
    // Use refs for synchronous checks to prevent duplicate requests
    if (isLoadingRef.current || !hasMoreRef.current) return;
    await fetchReports(pageRef.current, true);
  }, [fetchReports]);

  return {
    reports,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
  };
}
