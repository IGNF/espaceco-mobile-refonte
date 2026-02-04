import { useTranslation } from 'react-i18next';
import { SlideUpPage } from '@/shared/ui/SlideUpPage';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Button } from '@/shared/ui/Button';
import { useCommunity } from '@/features/community/hooks/useCommunity';

import styles from './NewReportPage.module.css';
import screen from '@/shared/styles/screen.module.css';
import typography from '@/shared/styles/typography.module.css';

export interface NewReportPageProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStandard: () => void;
  onSelectTrace: () => void;
}

export function NewReportPage({
  isOpen,
  onClose,
  onSelectStandard,
  onSelectTrace,
}: NewReportPageProps) {
  const { t } = useTranslation();
  const { activeCommunity } = useCommunity();

  const communityName = activeCommunity?.name ?? '';

  return (
    <SlideUpPage isOpen={isOpen} onClose={onClose}>
      <PageHeader
        title={t('reports.newReportChoice.headerTitle')}
        subtitle={communityName}
        showBackButton
        onBack={onClose}
        onClose={onClose}
      />

      <main className={screen.screenContainer}>
        <div className={styles.titleSection}>
          <h1 className={typography.title}>
            {t('reports.newReportChoice.title')}
          </h1>
          <p className={typography.subtitle}>
            {t('reports.newReportChoice.subtitle', { communityName })}
          </p>
        </div>

        <p className={styles.description}>
          {t('reports.newReportChoice.description')}
        </p>

        <h2 className={styles.question}>
          {t('reports.newReportChoice.question')}
        </h2>

        <div className={styles.buttonContainer}>
          <Button color="primary" fullWidth onClick={onSelectStandard}>
            {t('reports.newReportChoice.standardReport')}
          </Button>
          <Button color="primary" fullWidth onClick={onSelectTrace}>
            {t('reports.newReportChoice.traceReport')}
          </Button>
        </div>
      </main>
    </SlideUpPage>
  );
}
