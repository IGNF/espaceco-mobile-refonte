import { useState, useEffect, useCallback, useRef } from 'react';
import { collabApiClient } from '@/infra/api';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { AppReport } from '@/domain/report/models';
import { mapApiReportsToAppReports, type ApiReportResponse } from '@/domain/report/mappers';

interface UseMyReportsOptions {
  limit?: number;
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
  const { limit = 10 } = options;
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
      console.log('fetchMyReports', { page, limit, userId: user.id });

      const response = await collabApiClient.report.getAll({
        author: user.id,
        page,
        limit,
      });

      console.log('fetchMyReports => response', response);

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
  }, [user, limit]);

  // Initial fetch when user changes
  useEffect(() => {
    pageRef.current = 1;
    hasMoreRef.current = true;
    setHasMore(true);
    fetchReports(1, false);
  }, [user, limit]);

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
