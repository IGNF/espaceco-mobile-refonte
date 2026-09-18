import { useTranslation } from 'react-i18next';

import { SlideUpPage } from '@/shared/ui/SlideUpPage';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Button } from '@/shared/ui/Button';
import { Banner } from '@/shared/ui/Banner';

import { useCommunity } from '@/features/community/hooks/useCommunity';
import { useMyReports } from '@/features/report/hooks/useMyReports';

import screen from '@/shared/styles/screen.module.css';
import typography from '@/shared/styles/typography.module.css';

import styles from './NewReportPage.module.css';

import { MAX_DRAFT_REPORTS_WARNING, MAX_DRAFT_REPORTS_BLOCK } from "@/shared/constants/report";

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
  const { draftReports } = useMyReports();

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

      {draftReports.length > MAX_DRAFT_REPORTS_WARNING && (
        <Banner
          title={t('reportsLimitReached.banner.warning.title')}
          message={t('reportsLimitReached.banner.warning.subtitle', { count: draftReports.length, limit: MAX_DRAFT_REPORTS_BLOCK })}
          canBeClosed={true}
          color="warning"
        />
      )}
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
