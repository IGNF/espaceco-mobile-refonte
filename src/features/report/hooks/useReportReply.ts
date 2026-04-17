import { useState, useCallback } from 'react';

import type { ReportStatus } from '@ign/mobile-core';

import { collabApiClient } from '@/infra/api';

import { mapApiReportToAppReport, type ApiReportResponse } from '@/domain/report/mappers';
import type { AppReport } from '@/domain/report/models';

import type { AppError } from '@/shared/errors/appError';
import { toAppError } from '@/shared/errors/appError';

interface UseReportReplyResult {
  submitReply: (reportId: number, title: string, content: string, status: ReportStatus) => Promise<AppReport | null>;
  isSubmitting: boolean;
  error: AppError | null;
}

export function useReportReply(): UseReportReplyResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  const submitReply = useCallback(async (reportId: number, title: string, content: string, status: string): Promise<AppReport | null> => {
    setIsSubmitting(true);
    setError(null);

    try {
      // TODO: handle title (for the moment, empty string from the UI)
      await collabApiClient.report.addReply(reportId, { title: title || "", content: content, status: status });
      const response = await collabApiClient.report.get(reportId);
      return mapApiReportToAppReport(response.data as ApiReportResponse);
    } catch (err) {
      setError(toAppError(err, {
        fallbackKind: 'unknown',
        fallbackTranslationKey: 'reports.details.reply.errorMessage',
      }));
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return { submitReply, isSubmitting, error };
}
