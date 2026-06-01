import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { get as getProjection } from 'ol/proj';

import type { Report } from '@ign/mobile-core';
import { ReportManager, ReportStatus } from '@ign/mobile-core';

import { collabApiClient } from '@/infra/api';
import { ReportStorageAdapter } from '@/infra/storage/ReportStorageAdapter';

import { mapAppReportToApiBody, mapApiReportToAppReport, type ApiReportResponse } from '@/domain/report/mappers';
import type { AppReport } from '@/domain/report/models';

import { WEB_MERCATOR_PROJECTION } from '@/shared/constants/projections';
import { showToastSafe } from '@/shared/utils/toast';
import { getUserFacingErrorMessage } from '@/shared/errors/appError';

import { type ReportSubmitError, toReportSubmitError } from '@/features/report/errors/reportSubmitError';
import { getReportSyncState, setReportSyncState } from '@/features/report/utils/reportSyncState';
import { addSessionSentReport } from '@/features/report/state/sessionSentReportsStore';
import {
  normalizeSketchForApi,
  sanitizeFeaturesForSketchPayload,
} from '@/features/report/utils/sketchPayload';

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
    const body: Record<string, Blob> = {};
    const blobs = await Promise.all(
      report.photos.map((photo) => reportStorage.getBlob(photo))
    );

    blobs.forEach((blob, index) => {
      body[`photo${index}`] = blob;
    });

    await collabApiClient.report.addAttachments(reportId, body);
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
  submitReport: (report: Report, options?: SubmitReportOptions) => Promise<AppReport | null>;
  isSubmitting: boolean;
  error: ReportSubmitError | null;
  clearError: () => void;
}

interface SubmitReportOptions {
  showErrorToast?: boolean;
  onError?: (error: ReportSubmitError) => void | Promise<void>;
}

async function resolveReportSnapshot(report: Report): Promise<Report> {
  const storedReport = await reportStorage.getReport(report.id);
  return storedReport ?? report;
}

async function persistAttachmentRetryState(report: Report, serverId: number): Promise<void> {
  const reportWithRetryState = setReportSyncState(report, {
    serverId,
    photosToSend: true,
  });

  await reportStorage.saveReport(reportWithRetryState);
}

async function fetchServerReport(serverId: number): Promise<AppReport | null> {
  try {
    const response = await collabApiClient.report.get(serverId);
    return mapApiReportToAppReport(response.data as ApiReportResponse);
  } catch (error) {
    console.warn('[report] failed to fetch server report after successful send', {
      serverId,
      error,
    });
    return null;
  }
}

async function deleteLocalReportQuietly(localReportId: number): Promise<void> {
  try {
    await reportStorage.deleteReport(localReportId);
  } catch (error) {
    console.warn('[report] failed to delete local report after successful send', {
      localReportId,
      error,
    });
  }
}

function toFallbackSubmittedReport(report: Report, serverId: number): AppReport {
  return {
    ...(report as AppReport),
    id: serverId,
  };
}

async function recordSubmittedReport(report: AppReport): Promise<AppReport> {
  await addSessionSentReport(report);
  return report;
}

export function useSubmitReport(): UseSubmitReportReturn {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<ReportSubmitError | null>(null);

  const clearError = useCallback(() => setError(null), []);
  const showSubmitError = useCallback(async (submitError: ReportSubmitError): Promise<void> => {
    await showToastSafe({
      text: getUserFacingErrorMessage(submitError, t, submitError.translationKey),
      duration: 'long',
      position: 'top',
    });
  }, [t]);

  const handleSubmitError = useCallback(async (
    submitError: ReportSubmitError,
    options?: SubmitReportOptions
  ): Promise<void> => {
    setError(submitError);
    await options?.onError?.(submitError);

    if (options?.showErrorToast !== false) {
      await showSubmitError(submitError);
    }
  }, [showSubmitError]);

  const submitReport = useCallback(async (
    report: Report,
    options?: SubmitReportOptions
  ): Promise<AppReport | null> => {
    setIsSubmitting(true);
    setError(null);

    try {
      const localReport = await resolveReportSnapshot(report);
      const reportPayload = withSketchFromFeatures({
        ...localReport,
        status: ReportStatus.Submit,
      });
      const syncState = getReportSyncState(reportPayload);

      if (syncState.serverId && syncState.photosToSend && !reportPayload.photos?.length) {
        await deleteLocalReportQuietly(reportPayload.id);

        const serverReport = await fetchServerReport(syncState.serverId);
        return await recordSubmittedReport(
          serverReport ?? toFallbackSubmittedReport(reportPayload, syncState.serverId)
        );
      }

      // Retry path for reports already created on server with pending attachment uploads.
      if (syncState.serverId && syncState.photosToSend && reportPayload.photos?.length) {
        try {
          await uploadReportAttachments(syncState.serverId, reportPayload);
          await deleteLocalReportQuietly(reportPayload.id);

          const serverReport = await fetchServerReport(syncState.serverId);
          return await recordSubmittedReport(
            serverReport ?? toFallbackSubmittedReport(reportPayload, syncState.serverId)
          );
        } catch (attachmentError) {
          await persistAttachmentRetryState(reportPayload, syncState.serverId);
          const submitError = toReportSubmitError(attachmentError, 'attachmentUploadFailed');
          await handleSubmitError(submitError, options);
          return null;
        }
      }

      const body = mapAppReportToApiBody(reportPayload);
      const response = await collabApiClient.report.add(body);
      const createdReportId = (response.data as ApiReportResponse).id;
      console.info('[report] report created', { localReportId: report.id, createdReportId });

      if (reportPayload.photos?.length) {
        try {
          await uploadReportAttachments(createdReportId, reportPayload);
        } catch (attachmentError) {
          console.error('Report created but attachment upload failed', attachmentError);
          await persistAttachmentRetryState(reportPayload, createdReportId);
          const submitError = toReportSubmitError(attachmentError, 'attachmentUploadFailed');
          await handleSubmitError(submitError, options);
          return null;
        }
      }

      // map back API response to AppReport
      const appReport = mapApiReportToAppReport(response.data as ApiReportResponse);

      // Delete the local draft now that the API accepted it
      await deleteLocalReportQuietly(reportPayload.id);

      return await recordSubmittedReport(appReport);
    } catch (err) {
      const submitError = toReportSubmitError(err, 'reportCreationFailed');
      await handleSubmitError(submitError, options);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [handleSubmitError]);

  return { submitReport, isSubmitting, error, clearError };
}
