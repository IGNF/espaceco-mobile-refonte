import { useTranslation } from 'react-i18next';
import { SlideUpPage } from '@/shared/ui/SlideUpPage';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Button } from '@/shared/ui/Button';
import { useGeolocation } from '@/shared/hooks/useGeolocation';
import type { AppReport } from '@/domain/report/models';

import IconSave from '@/shared/assets/icons/icon-save.svg?react';
import IconSend from '@/shared/assets/icons/icon-send.svg?react';
import IconClose from '@/shared/assets/icons/icon-close.svg?react';

import styles from './CreateOrEditReportPage.module.css';
import screen from '@/shared/styles/screen.module.css';
import typography from '@/shared/styles/typography.module.css';

export type ReportPageMode = 'create' | 'edit';

export interface CreateOrEditReportPageProps {
  isOpen: boolean;
  onClose: () => void;
  mode: ReportPageMode;
  report?: AppReport | null;
  onBack?: () => void;
  level?: number;
}

export function CreateOrEditReportPage({
  isOpen,
  onClose,
  mode,
  report,
  onBack,
  level = 2,
}: CreateOrEditReportPageProps) {
  const { t } = useTranslation();
  const isEditMode = mode === 'edit';

  const { position, isLocating, error, fetchPosition } = useGeolocation({
    fetchOnMount: !isEditMode, // fetch position only on create mode
  });

  const headerTitle = isEditMode
    ? t('reports.createOrEdit.headerTitleEdit')
    : t('reports.createOrEdit.headerTitleCreate');

  const pageTitle = isEditMode
    ? t('reports.createOrEdit.titleEdit')
    : t('reports.createOrEdit.titleCreate');

  const pageSubtitle = isEditMode
    ? `${t('reports.createOrEdit.subtitleEdit')} n°${report?.id ?? ''}`
    : t('reports.createOrEdit.subtitleCreate');

  const handleSaveDraft = () => {
    console.log('Save draft', { mode, report, position });
  };

  const handleSend = () => {
    console.log('Send report', { mode, report, position });
  };

  const handleCancel = () => {
    console.log('Cancel', { mode });
    if (onBack) {
      onBack();
    } else {
      onClose();
    }
  };

  const renderGeolocationStatus = () => {
    if (isEditMode) return null;

    if (isLocating) {
      return (
        <div className={styles.geolocationStatus}>
          {t('reports.createOrEdit.geolocation.locating')}
        </div>
      );
    }

    if (error) {
      const errorKey = error === 'permissionDenied' ? 'permissionDenied' : 'error';
      return (
        <div className={`${styles.geolocationStatus} ${styles.error}`}>
          {t(`reports.createOrEdit.geolocation.${errorKey}`)}
          <button className={styles.retryButton} onClick={fetchPosition}>
            {t('reports.createOrEdit.geolocation.retry')}
          </button>
        </div>
      );
    }

    if (position) {
      return (
        <div className={styles.geolocationStatus}>
          {t('reports.createOrEdit.geolocation.located')}
        </div>
      );
    }

    return null;
  };

  return (
    <SlideUpPage isOpen={isOpen} onClose={onClose} level={level}>
      <PageHeader
        title={headerTitle}
        subtitle={t('reports.createOrEdit.headerSubtitle')}
        showBackButton={isEditMode}
        onBack={onBack}
        onClose={onClose}
      />

      <main className={screen.screenContainer}>
        <div className={styles.titleSection}>
          <h1 className={typography.title}>{pageTitle}</h1>
          <p className={typography.subtitle}>{pageSubtitle}</p>
        </div>

        {renderGeolocationStatus()}

        {/* TODO: Form fields will be added here */}

        <div className={styles.buttonContainer}>
          <Button color="primary" onClick={handleSaveDraft}>
            <IconSave className={styles.buttonIcon} />
            {t('reports.createOrEdit.actions.saveDraft')}
          </Button>
          <Button color="tertiary" onClick={handleSend}>
            <IconSend className={styles.buttonIcon}/>
            {t('reports.createOrEdit.actions.send')}
          </Button>
          <Button color="medium" variant="outline" onClick={handleCancel}>
            <IconClose className={styles.buttonIcon} />
            {t('reports.createOrEdit.actions.cancel')}
          </Button>
        </div>
      </main>
    </SlideUpPage>
  );
}
