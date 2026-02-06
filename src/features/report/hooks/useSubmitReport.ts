import { useState, useCallback } from 'react';
import type { Report } from '@ign/mobile-core';
import { collabApiClient } from '@/infra/api';
import { mapAppReportToApiBody, mapApiReportToAppReport, type ApiReportResponse } from '@/domain/report/mappers';
import { ReportStorageAdapter } from '@/infra/storage/ReportStorageAdapter';
import type { AppReport } from '@/domain/report/models';

const reportStorage = new ReportStorageAdapter();

interface UseSubmitReportReturn {
  submitReport: (report: Report) => Promise<AppReport | null>;
  isSubmitting: boolean;
  error: Error | null;
  clearError: () => void;
}

export function useSubmitReport(): UseSubmitReportReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const submitReport = useCallback(async (report: Report): Promise<AppReport | null> => {
    setIsSubmitting(true);
    setError(null);

    try {
      const body = mapAppReportToApiBody(report);
      const response = await collabApiClient.report.add(body);
      // map back API response to AppReport
      const appReport = mapApiReportToAppReport(response.data as ApiReportResponse);

      // Delete the local draft now that the API accepted it
      await reportStorage.deleteReport(report.id);

      return appReport;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to submit report');
      setError(error);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return { submitReport, isSubmitting, error, clearError };
}
