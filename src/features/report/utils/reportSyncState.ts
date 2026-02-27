import type { Report } from '@ign/mobile-core';
import type { ReportExtraData, ReportSyncMetadata } from '@/domain/report/models';

type ReportWithExtraData = Report & { extraData?: ReportExtraData };

function normalizeServerId(value: unknown): number | undefined {
  if ((typeof value !== 'number') || value <= 0) return undefined;
  return value;
}

export function getReportSyncState(report: ReportWithExtraData): ReportSyncMetadata {
  const syncState = report.extraData?.sync;

  return {
    serverId: normalizeServerId(syncState?.serverId),
    photosToSend: syncState?.photosToSend === true,
  };
}

export function setReportSyncState(
  report: ReportWithExtraData,
  syncState: ReportSyncMetadata
): ReportWithExtraData {
  return {
    ...report,
    extraData: {
      ...(report.extraData ?? {}),
      sync: {
        serverId: normalizeServerId(syncState.serverId),
        photosToSend: syncState.photosToSend === true,
      },
    },
  };
}
