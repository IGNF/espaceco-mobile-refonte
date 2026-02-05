import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SlideUpPage } from '@/shared/ui/SlideUpPage';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Button } from '@/shared/ui/Button';
import { useGeolocation } from '@/shared/hooks/useGeolocation';
import { useCommunity } from '@/features/community/hooks/useCommunity';
import { useReportForm } from '@/features/report/hooks/useReportForm';
import { ReportForm } from '@/features/report/components/NewReport/ReportForm';
import type { AppReport } from '@/domain/report/models';
import type { Position } from '@/platform/device/geolocation';

import IconSave from '@/shared/assets/icons/icon-save.svg?react';
import IconSend from '@/shared/assets/icons/icon-send.svg?react';
import IconClose from '@/shared/assets/icons/icon-close.svg?react';

import styles from './CreateOrEditReportPage.module.css';
import buttonStyles from '@/shared/ui/Button/Button.module.css';
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
  const { activeCommunity } = useCommunity();
  const isEditMode = mode === 'edit';

  const { position: geoPosition, isLocating, error, fetchPosition } = useGeolocation({
    fetchOnMount: !isEditMode, // fetch position only on create mode
  });

  // In edit mode, reconstruct position from saved geometry ("POINT(lon lat)")
  const reportGeometry = report?.geometry;
  const editPosition = useMemo<Position | null>(() => {
    if (!reportGeometry) return null;
    const match = reportGeometry.match(/POINT\(\s*([^\s]+)\s+([^\s]+)\s*\)/);
    if (!match) return null;
    const lon = parseFloat(match[1]);
    const lat = parseFloat(match[2]);
    if (isNaN(lon) || isNaN(lat)) return null;
    return { coords: { longitude: lon, latitude: lat, accuracy: 0, altitude: null, altitudeAccuracy: null, heading: null, speed: null }, timestamp: 0 };
  }, [reportGeometry]);

  const position = isEditMode ? editPosition : geoPosition;

  const form = useReportForm({ mode, report, position, isOpen });

  const headerTitle = isEditMode
    ? t('reports.createOrEdit.headerTitleEdit')
    : t('reports.createOrEdit.headerTitleCreate');

  const pageTitle = isEditMode
    ? t('reports.createOrEdit.titleEdit')
    : t('reports.createOrEdit.titleCreate');

  const pageSubtitle = isEditMode
    ? `${t('reports.createOrEdit.subtitleEdit')} n°${report?.id ?? ''}`
    : activeCommunity
      ? `${t('reports.createOrEdit.subtitleCreate')} - ${activeCommunity.name}`
      : t('reports.createOrEdit.subtitleCreate');

  const handleSaveDraft = async () => {
    await form.saveDraft();
    onClose();
  };

  const handleSend = async () => {
    if (!form.validate()) return;
    await form.submit();
    onClose();
  };

  const handleCancel = () => {
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

        <ReportForm
          form={form}
          position={position}
          isLocating={isLocating}
        />

        <div className={styles.buttonContainer}>
          <Button
            color="primary"
            fullWidth
            loading={form.isSaving}
            onClick={handleSaveDraft}
          >
            <IconSave className={buttonStyles.icon} />
            {t('reports.createOrEdit.actions.saveDraft')}
          </Button>
          <Button
            color="tertiary"
            fullWidth
            loading={form.isSaving}
            onClick={handleSend}
          >
            <IconSend className={buttonStyles.icon}/>
            {t('reports.createOrEdit.actions.send')}
          </Button>
          <Button
            color="medium"
            variant="outline"
            fullWidth
            onClick={handleCancel}
          >
            <IconClose className={buttonStyles.icon} />
            {t('reports.createOrEdit.actions.cancel')}
          </Button>
        </div>
      </main>
    </SlideUpPage>
  );
}
