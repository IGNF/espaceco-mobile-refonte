import { useState, useEffect, useCallback, useRef } from 'react';
import { collabApiClient } from '@/infra/api';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { AppReport, ReportFilters } from '@/domain/report/models';
import { mapApiReportsToAppReports, type ApiReportResponse } from '@/domain/report/mappers';

interface UseMyReportsOptions {
  limit?: number;
  filters?: ReportFilters;
}

interface UseMyReportsResult {
  reports: AppReport[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useMyReports(options: UseMyReportsOptions = {}): UseMyReportsResult {
  const { limit = 10, filters } = options;
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
    if (!user) {
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
      /**
       * TODO
       * Here it should retrieve only draft reports
       * Then we can remove all references to filters and limit
       */
      return [];

    } catch (err) {
      console.error('fetchMyReports => error', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch reports'));
      if (!append) {
        setReports([]);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      isLoadingRef.current = false;
    }
  }, [user, limit, filters]);

  // Initial fetch when user or filters change
  useEffect(() => {
    pageRef.current = 1;
    hasMoreRef.current = true;
    setHasMore(true);
    fetchReports(1, false);
  }, [user, limit, filters]);

  const loadMore = useCallback(async () => {
    // Use refs for synchronous checks to prevent duplicate requests
    if (isLoadingRef.current || !hasMoreRef.current) return;
    await fetchReports(pageRef.current, true);
  }, [fetchReports]);

  const refetch = useCallback(async () => {
    pageRef.current = 1;
    setHasMore(true);
    await fetchReports(1, false);
  }, [fetchReports]);

  return {
    reports,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    refetch,
  };
}
