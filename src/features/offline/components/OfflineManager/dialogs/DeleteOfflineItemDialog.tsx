import { useTranslation } from 'react-i18next';
import { Alert } from '@/shared/ui/Alert';

interface DeleteOfflineItemDialogProps {
  isOpen: boolean;
  title: string;
  subtitle: string;
  isProcessing: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteOfflineItemDialog({
  isOpen,
  title,
  subtitle,
  isProcessing,
  onClose,
  onConfirm,
}: DeleteOfflineItemDialogProps) {
  const { t } = useTranslation();

  return (
    <Alert
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      buttons={[
        {
          label: t('offline.dialog.delete'),
          onClick: onConfirm,
          color: 'danger',
          loading: isProcessing,
        },
        {
          label: t('offline.dialog.cancel'),
          onClick: onClose,
          variant: 'outline',
          disabled: isProcessing,
        },
      ]}
    />
  );
}
