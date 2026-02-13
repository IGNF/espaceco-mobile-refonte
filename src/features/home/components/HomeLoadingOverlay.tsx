import { useTranslation } from 'react-i18next';
import { Loading } from '@/shared/ui/Loading';
import styles from './HomeLoadingOverlay.module.css';

export interface HomeLoadingOverlayProps {
  isVisible: boolean;
}

export function HomeLoadingOverlay({ isVisible }: HomeLoadingOverlayProps) {
  const { t } = useTranslation();

  if (!isVisible) {
    return null;
  }

  return (
    <div className={styles.loadingOverlay} role='status' aria-live='polite'>
      <Loading
        size='large'
        label={t('home.loading.message')}
        className={styles.loadingOverlaySpinner}
      />
    </div>
  );
}
