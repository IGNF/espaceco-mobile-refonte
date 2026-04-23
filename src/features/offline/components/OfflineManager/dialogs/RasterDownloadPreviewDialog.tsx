import { useTranslation } from 'react-i18next';
import type { OfflineRasterDownloadPreview } from '@/domain/offline/models';
import { Alert } from '@/shared/ui/Alert';
import { formatDurationFromMs } from '@/shared/utils/date';
import typography from '@/shared/styles/typography.module.css';
import styles from '@/features/offline/pages/OfflineManagementPage.module.css';

interface RasterDownloadPreviewDialogProps {
  preview: OfflineRasterDownloadPreview | null;
  mapName: string | null;
  zoneName: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function RasterDownloadPreviewDialog({
  preview,
  mapName,
  zoneName,
  onClose,
  onConfirm,
}: RasterDownloadPreviewDialogProps) {
  const { t } = useTranslation();

  return (
    <Alert
      isOpen={preview !== null}
      onClose={onClose}
      title={t('offline.raster.previewTitle')}
      subtitle={t('offline.raster.previewSubtitle', {
        map: mapName,
        zone: zoneName,
      })}
      buttons={[
        {
          label: t('offline.raster.download'),
          onClick: onConfirm,
        },
        {
          label: t('offline.dialog.cancel'),
          onClick: onClose,
          variant: 'outline',
        },
      ]}
    >
      {preview && (
        <div className={styles.dialogContent}>
          <span className={typography.body}>
            {t('offline.raster.previewTileCount', {
              count: preview.tileCount,
            })}
          </span>
          <span className={typography.body}>
            {t('offline.raster.previewSize', {
              value: preview.estimatedSizeMb.toLocaleString('fr-FR', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              }),
            })}
          </span>
          <span className={typography.body}>
            {t('offline.raster.previewTime', {
              value: formatDurationFromMs(preview.estimatedTimeMs),
            })}
          </span>
          {preview.freeDiskSpaceMb != null && (
            <span className={typography.body}>
              {t('offline.raster.previewFreeSpace', {
                value: preview.freeDiskSpaceMb.toLocaleString('fr-FR', {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                }),
              })}
            </span>
          )}
        </div>
      )}
    </Alert>
  );
}
