import { useState, useCallback } from 'react';
import type { Report } from '@ign/mobile-core';
import { ReportManager } from '@ign/mobile-core';
import { get as getProjection } from 'ol/proj';
import { collabApiClient } from '@/infra/api';
import { mapAppReportToApiBody, mapApiReportToAppReport, type ApiReportResponse } from '@/domain/report/mappers';
import { ReportStorageAdapter } from '@/infra/storage/ReportStorageAdapter';
import type { AppReport } from '@/domain/report/models';
import { WEB_MERCATOR_PROJECTION } from '@/shared/constants/projections';
import {
  normalizeSketchForApi,
  sanitizeFeaturesForSketchPayload,
} from '@/features/report/utils/sketchPayload';

export const ATTACHMENT_UPLOAD_FAILED_ERROR_CODE = 'ATTACHMENT_UPLOAD_FAILED'

const reportStorage = new ReportStorageAdapter();
const reportManager = new ReportManager(collabApiClient, reportStorage);

function withSketchFromFeatures(report: Report): Report {
  if (report.sketch || !report.features?.length) {
    return report;
  }

  try {
    const serializableFeatures = sanitizeFeaturesForSketchPayload(report.features);
    if (serializableFeatures.length === 0) {
      return report;
    }

    const reportProjection = getProjection(WEB_MERCATOR_PROJECTION);
    const rawSketch = reportProjection
      ? reportManager.feature2sketch(serializableFeatures, reportProjection)
      : reportManager.feature2sketch(serializableFeatures);
    const sketch = normalizeSketchForApi(rawSketch);
    if (!sketch) {
      return report;
    }

    return {
      ...report,
      sketch,
    };
  } catch (error) {
    console.error('[report] failed to generate sketch from selected objects', error);
    return report;
  }
}

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
      const reportPayload = withSketchFromFeatures(report);
      const body = mapAppReportToApiBody(reportPayload);
      const response = await collabApiClient.report.add(body);
      const createdReportId = (response.data as ApiReportResponse).id;
      console.info('[report] report created', { localReportId: report.id, createdReportId });

      if (reportPayload.photos?.length) {
        try {
          await uploadReportAttachments(createdReportId, reportPayload);
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
