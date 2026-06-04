import { useTranslation } from 'react-i18next';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import inputs from '@/shared/styles/inputs.module.css';
import styles from '@/features/offline/pages/OfflineManagementPage.module.css';

interface RenameRasterMapDialogProps {
  isOpen: boolean;
  name: string;
  isSubmitting: boolean;
  onClose: () => void;
  onChangeName: (value: string) => void;
  onValidate: () => void;
}

export function RenameRasterMapDialog({
  isOpen,
  name,
  isSubmitting,
  onClose,
  onChangeName,
  onValidate,
}: RenameRasterMapDialogProps) {
  const { t } = useTranslation();

  return (
    <Alert
      isOpen={isOpen}
      onClose={isSubmitting ? () => undefined : onClose}
      title={t('offline.raster.renameTitle')}
    >
      <div className={styles.dialogContent}>
        <label className={inputs.field}>
          <span className={inputs.label}>{t('offline.raster.nameLabel')}</span>
          <input
            type='text'
            className={inputs.input}
            value={name}
            onChange={(event) => onChangeName(event.target.value)}
            disabled={isSubmitting}
          />
        </label>

        <div className={styles.dialogActions}>
          <Button
            variant='outline'
            color='medium'
            onClick={onClose}
            disabled={isSubmitting}
          >
            {t('offline.dialog.cancel')}
          </Button>
          <Button
            onClick={onValidate}
            disabled={name.trim().length === 0}
            loading={isSubmitting}
          >
            {t('offline.dialog.validate')}
          </Button>
        </div>
      </div>
    </Alert>
  );
}
