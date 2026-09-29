import { ReportStorageAdapter } from '@/infra/storage';
import { blobToBase64 } from '@/shared/utils/blob';
import { exportDateStamp, type ExportFilePart } from '@/platform/device/exportFile';

const reportStorage = new ReportStorageAdapter();

/**
 * Exports local draft reports and their photos.
 * Each photo is named photos/{reportId}_{photoNumber}.jpg so it can be matched to its report.
 */
export async function exportDraftReports(dateStamp = exportDateStamp()): Promise<ExportFilePart[]> {
  const drafts = await reportStorage.listStoredDrafts();
  const fileName = `${dateStamp}_signalements.json`;
  const files: ExportFilePart[] = [];
  const reports = [];

  for (const draft of drafts) {
    const sourcePhotos = Array.isArray(draft.photos) ? draft.photos : [];
    const photos = [];

    for (let index = 0; index < sourcePhotos.length; index += 1) {
      const photo = sourcePhotos[index];
      if (!photo?.localPath) continue;

      const blob = await reportStorage.getBlob(photo);
      const extension = blob.type === 'image/png' ? 'png' : 'jpg';
      const path = `photos/${draft.id}_${index + 1}.${extension}`;
      files.push({
        path,
        data: await blobToBase64(blob),
        encoding: 'base64',
      });
      photos.push({ file: path });
    }

    reports.push({
      ...draft,
      photos,
    });
  }

  files.push({
    path: fileName,
    data: JSON.stringify({
      exportedAt: new Date().toISOString(),
      reports,
    }, null, 2),
    encoding: 'utf8',
  });

  return files;
}
