import { useTranslation } from 'react-i18next';
import type { OfflineZone } from '@/domain/offline/models';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import { Loading } from '@/shared/ui/Loading';
import styles from '@/features/offline/pages/OfflineManagementPage.module.css';

interface RasterZoneDialogProps {
  isOpen: boolean;
  mode: 'load-map' | 'add-zone' | 'pending-maps' | null;
  subtitle?: string;
  zones: OfflineZone[];
  isPreviewLoading: boolean;
  onClose: () => void;
  onSelectZone: (zoneName: string) => void;
}

export function RasterZoneDialog({
  isOpen,
  mode,
  subtitle,
  zones,
  isPreviewLoading,
  onClose,
  onSelectZone,
}: RasterZoneDialogProps) {
  const { t } = useTranslation();
  let title = t('offline.raster.chooseZoneToLoad');

  if (mode === 'pending-maps') {
    title = t('offline.raster.chooseZoneForPending');
  }
  else if (mode === 'add-zone') {
    title = t('offline.raster.chooseZoneToAdd');
  }

  return (
    <Alert
      isOpen={isOpen}
      onClose={isPreviewLoading ? () => undefined : onClose}
      title={title}
      subtitle={subtitle}
    >
      <div className={styles.dialogContent}>
        {isPreviewLoading && (
          <Loading
            size='small'
            label={t('offline.raster.previewLoading')}
          />
        )}

        <div className={styles.dialogList}>
          {zones.map((zone) => (
            <Button
              key={zone.name}
              fullWidth
              variant='outline'
              color='secondary'
              disabled={isPreviewLoading}
              onClick={() => onSelectZone(zone.name)}
            >
              {zone.name}
            </Button>
          ))}
        </div>
      </div>
    </Alert>
  );
}
