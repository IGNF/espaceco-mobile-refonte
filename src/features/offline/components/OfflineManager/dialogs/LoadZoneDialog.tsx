import { useTranslation } from 'react-i18next';
import type { OfflineZone } from '@/domain/offline/models';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import styles from '@/features/offline/pages/OfflineManagementPage.module.css';

interface LoadZoneDialogProps {
  isOpen: boolean;
  zones: OfflineZone[];
  onClose: () => void;
  onSelectZone: (zoneName: string) => void;
}

export function LoadZoneDialog({
  isOpen,
  zones,
  onClose,
  onSelectZone,
}: LoadZoneDialogProps) {
  const { t } = useTranslation();

  return (
    <Alert
      isOpen={isOpen}
      onClose={onClose}
      title={t('offline.cache.chooseZone')}
    >
      <div className={styles.dialogContent}>
        <div className={styles.dialogList}>
          {zones.map((zone) => (
            <Button
              key={zone.name}
              fullWidth
              variant='outline'
              color='secondary'
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
