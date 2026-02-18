import { useState, useCallback } from 'react';
import type { Report } from '@ign/mobile-core';
import { ReportManager } from '@ign/mobile-core';
import { collabApiClient } from '@/infra/api';
import { mapAppReportToApiBody, mapApiReportToAppReport, type ApiReportResponse } from '@/domain/report/mappers';
import { ReportStorageAdapter } from '@/infra/storage/ReportStorageAdapter';
import type { AppReport } from '@/domain/report/models';

export const ATTACHMENT_UPLOAD_FAILED_ERROR_CODE = 'ATTACHMENT_UPLOAD_FAILED'

const reportStorage = new ReportStorageAdapter();
const reportManager = new ReportManager(collabApiClient, reportStorage);

async function uploadReportAttachments(reportId: number, report: Report): Promise<void> {
  if (!report.photos?.length) return;

  console.info('[report] uploading attachments', {
    reportId,
    photoCount: report.photos.length,
    photos: report.photos.map(photo => photo.localPath),
  });

  try {
    await reportManager.uploadAttachements(reportId, {
      communityId: report.communityId,
      themeId: report.themeId,
      geometry: report.geometry,
      comment: report.comment,
      photos: report.photos,
      photosToSend: true,
    });
    console.info('[report] attachments uploaded', { reportId });
  } catch (error) {
    console.error('[report] attachment upload error', {
      reportId,
      error,
    });
    throw error instanceof Error ? error : new Error('Failed to upload attachments');
  }
}

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
      const createdReportId = (response.data as ApiReportResponse).id;
      console.info('[report] report created', { localReportId: report.id, createdReportId });

      if (report.photos?.length) {
        try {
          await uploadReportAttachments(createdReportId, report);
        } catch (attachmentError) {
          console.error('Report created but attachment upload failed', attachmentError);
          setError(new Error(ATTACHMENT_UPLOAD_FAILED_ERROR_CODE));
          return null;
        }
      }

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
