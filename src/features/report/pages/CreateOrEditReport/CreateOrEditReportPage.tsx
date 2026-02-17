import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Toast } from '@capacitor/toast';
import type Map from 'ol/Map';
import { fromLonLat, toLonLat } from 'ol/proj';
import { SlideUpPage } from '@/shared/ui/SlideUpPage';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Button } from '@/shared/ui/Button';
import { useGeolocation } from '@/shared/hooks/useGeolocation';
import { parsePointGeometry } from '@/shared/utils/geometry';
import { createPositionFromLonLat } from '@/shared/utils/position';
import { useCommunity } from '@/features/community/hooks/useCommunity';
import { useReportForm } from '@/features/report/hooks/useReportForm';
import { ReportForm } from '@/features/report/components/NewReport/ReportForm';
import type { AppReport } from '@/domain/report/models';
import type { Position } from '@/platform/device/geolocation';

import IconSave from '@/shared/assets/icons/icon-save.svg?react';
import IconSend from '@/shared/assets/icons/icon-send.svg?react';
import IconClose from '@/shared/assets/icons/icon-close.svg?react';
import IconAdd from '@/shared/assets/icons/icon-add.svg?react';

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
  map?: Map | null;
  onSearchPanelVisibilityChange?: (isVisible: boolean) => void;
}

export function CreateOrEditReportPage({
  isOpen,
  onClose,
  mode,
  report,
  onBack,
  level = 2,
  map,
  onSearchPanelVisibilityChange,
}: CreateOrEditReportPageProps) {
  const { t } = useTranslation();
  const { activeCommunity } = useCommunity();
  const isEditMode = mode === 'edit';
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [isPickingPosition, setIsPickingPosition] = useState(false);

  const { position: geoPosition, isLocating, error, fetchPosition } = useGeolocation({
    fetchOnMount: !isEditMode, // fetch position only on create mode
  });

  // In edit mode, reconstruct position from saved geometry ("POINT(lon lat)")
  const reportGeometry = report?.geometry;
  const editPosition = useMemo<Position | null>(() => {
    if (!reportGeometry) return null;
    const parsedGeometry = parsePointGeometry(reportGeometry);
    if (!parsedGeometry) return null;
    return createPositionFromLonLat(parsedGeometry.lon, parsedGeometry.lat, { timestamp: 0 });
  }, [reportGeometry]);

  const basePosition = isEditMode ? editPosition : geoPosition;
  const position = selectedPosition ?? basePosition;
  const canEditPosition = !isEditMode && Boolean(map);

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

  const closePositionPicker = useCallback(() => {
    setIsPickingPosition(false);
    onSearchPanelVisibilityChange?.(false);
  }, [onSearchPanelVisibilityChange]);

  const resetPositionPicker = useCallback(() => {
    closePositionPicker();
    setSelectedPosition(null);
  }, [closePositionPicker]);

  const handleStartPositionPicker = useCallback(() => {
    if (!map) return;

    if (position) {
      map.getView().animate({
        center: fromLonLat([position.coords.longitude, position.coords.latitude]),
        duration: 250,
      });
    }

    setIsPickingPosition(true);
    onSearchPanelVisibilityChange?.(true);
  }, [map, onSearchPanelVisibilityChange, position]);

  const handleValidatePosition = useCallback(() => {
    if (!map) return;
    const center = map.getView().getCenter();
    if (!center) return;

    const [longitude, latitude] = toLonLat(center);
    const nextPosition = createPositionFromLonLat(longitude, latitude, { fallback: position });
    setSelectedPosition(nextPosition);
    closePositionPicker();
  }, [map, position, closePositionPicker]);

  const handlePageClose = useCallback(() => {
    resetPositionPicker();
    onClose();
  }, [resetPositionPicker, onClose]);

  const handlePageBack = useCallback(() => {
    resetPositionPicker();
    onBack?.();
  }, [resetPositionPicker, onBack]);

  const handleSaveDraft = async () => {
    await form.saveDraft();
    resetPositionPicker();
    setTimeout(async () => {
      onClose();
      await Toast.show({
        text: t('reports.createOrEdit.actions.draftSaved'),
        duration: 'short',
        position: 'top',
      });
    }, 300);
  };

  const handleSend = async () => {
    if (!form.validate()) return;
    const success = await form.submit();
    if (success) {
      resetPositionPicker();
      onClose();
    }
  };

  const handleCancel = () => {
    resetPositionPicker();
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
    <>
      <SlideUpPage
        isOpen={isOpen}
        onClose={onClose}
        level={level}
        className={isPickingPosition ? styles.locationPickerSheet : undefined}
      >
        <PageHeader
          title={headerTitle}
          subtitle={t('reports.createOrEdit.headerSubtitle')}
          showBackButton={isEditMode}
          onBack={onBack ? handlePageBack : undefined}
          onClose={handlePageClose}
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
            onEditPosition={canEditPosition ? handleStartPositionPicker : undefined}
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
              <IconSend className={buttonStyles.icon} />
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

          {form.submitError && (
            <p className={styles.submitError}>
              {t('reports.createOrEdit.actions.submitError')}
            </p>
          )}
        </main>
      </SlideUpPage>

      {isOpen && isPickingPosition && map && (
        <div className={styles.locationPickerOverlay}>
          <div className={styles.locationTarget} aria-hidden="true">
            <IconAdd className={styles.locationTargetIcon} />
          </div>
          <div className={styles.validateButtonContainer}>
            <Button
              color="primary"
              onClick={handleValidatePosition}
              className={styles.validateButton}
            >
              {t('reports.createOrEdit.actions.validatePosition')}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
