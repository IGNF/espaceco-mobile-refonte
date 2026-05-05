import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ReportStatus } from '@ign/mobile-core';
import { createPortal } from 'react-dom';
import Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import type BaseLayer from 'ol/layer/Base';
import type OlMap from 'ol/Map';
import type MapBrowserEvent from 'ol/MapBrowserEvent';
import { fromLonLat, toLonLat } from 'ol/proj';
import { SlideUpPage } from '@/shared/ui/SlideUpPage';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Button } from '@/shared/ui/Button';
import { Alert } from '@/shared/ui/Alert';
import { MapToolbar, type MapToolbarItem } from '@/features/map/components/MapToolbar';
import { useGeolocation } from '@/shared/hooks/useGeolocation';
import { useUnsavedChangesGuard } from '@/shared/hooks/useUnsavedChangesGuard';
import { parsePointGeometry } from '@/shared/utils/geometry';
import { createPositionFromLonLat } from '@/shared/utils/position';
import { showToastSafe } from '@/shared/utils/toast';
import { useCommunity } from '@/features/community/hooks/useCommunity';
import { useReportForm } from '@/features/report/hooks/useReportForm';
import { useReportSketchSession } from '@/features/report/hooks/useReportSketchSession';
import { useReportTraceSession } from '@/features/report/hooks/useReportTraceSession';
import { getReportSubmitErrorTranslationKey } from '@/features/report/errors/reportSubmitError';
import { ReportForm } from '@/features/report/components/NewReport/ReportForm';
import { TraceToolbar } from '@/features/report/components/Trace/TraceToolbar';
import {
  applyReportObjectMetadata,
  buildReportObjectKey,
  getLayerDisplayTitle,
  getReportObjectLabel,
} from '@/features/report/utils/reportObjects';
import {
  getSketchToolActionById,
  SKETCH_TOOL_DEFINITIONS,
} from '@/features/report/constants/reportSketch.constants';
import type { AppReport, MapPickerMode, ReportType } from '@/domain/report/models';
import type { Position } from '@/platform/device/geolocation';

import IconSave from '@/shared/assets/icons/icon-save.svg?react';
import IconSend from '@/shared/assets/icons/icon-send.svg?react';
import IconClose from '@/shared/assets/icons/icon-close.svg?react';
import IconAdd from '@/shared/assets/icons/icon-add.svg?react';

import styles from './CreateOrEditReportPage.module.css';
import buttonStyles from '@/shared/ui/Button/Button.module.css';
import screen from '@/shared/styles/screen.module.css';
import typography from '@/shared/styles/typography.module.css';
import { NON_SELECTABLE_LAYER_NAMES } from '@/shared/constants/report';

export type ReportPageMode = 'create' | 'edit';

export interface CreateOrEditReportPageProps {
  isOpen: boolean;
  onClose: () => void;
  mode: ReportPageMode;
  reportType?: ReportType;
  report?: AppReport | null;
  onBack?: () => void;
  level?: number;
  map?: OlMap | null;
  onSearchPanelVisibilityChange?: (isVisible: boolean) => void;
}

interface PickedMapObjectCandidate {
  key: string;
  label: string;
  layerTitle: string;
  feature: Feature<Geometry>;
}

function getLayerName(layer: BaseLayer | null | undefined): string {
  if (!layer) return 'layer';

  const layerName = layer.get('name');
  return typeof layerName === 'string' && layerName.trim().length > 0
    ? layerName
    : 'layer';
}

function isSelectableReportObjectLayer(layer: BaseLayer | null | undefined): boolean {
  if (!layer) return false;
  if (!layer.getVisible()) return false;

  const layerName = layer.get('name');
  if (typeof layerName === 'string' && NON_SELECTABLE_LAYER_NAMES.has(layerName)) {
    return false;
  }

  return true;
}

export function CreateOrEditReportPage({
  isOpen,
  onClose,
  mode,
  reportType,
  report,
  onBack,
  level = 2,
  map,
  onSearchPanelVisibilityChange,
}: CreateOrEditReportPageProps) {
  const { t } = useTranslation();
  const { activeCommunity } = useCommunity();
  const isEditMode = mode === 'edit';
  const isDraftReport = report?.status === ReportStatus.Draft;
  const resolvedReportType: ReportType = reportType ?? 'standard';
  const isTraceReport = resolvedReportType === 'trace';
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [mapPickerMode, setMapPickerMode] = useState<MapPickerMode>('none');
  const [objectCandidates, setObjectCandidates] = useState<PickedMapObjectCandidate[]>([]);
  const [isObjectChoiceOpen, setIsObjectChoiceOpen] = useState(false);
  const [isSendConfirmOpen, setIsSendConfirmOpen] = useState(false);
  const [isSendSuccessOpen, setIsSendSuccessOpen] = useState(false);

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
  const canEditPosition = Boolean(map);
  const canPickObjects = !isTraceReport && Boolean(map) && (!isEditMode || isDraftReport);
  const canPickSketches = !isTraceReport && Boolean(map) && (!isEditMode || isDraftReport);
  const canPickTrace = isTraceReport && Boolean(map) && (!isEditMode || isDraftReport);
  const canViewReportPosition = isEditMode && isDraftReport && Boolean(map) && Boolean(position);
  const isPickingPosition = mapPickerMode === 'position';
  const isViewingPosition = mapPickerMode === 'view-position';
  const isPickingObject = mapPickerMode === 'object';
  const isPickingSketch = mapPickerMode === 'sketch';
  const isPickingTrace = mapPickerMode === 'trace';
  const isPickingOnMap = mapPickerMode !== 'none';

  const form = useReportForm({
    mode,
    report,
    position,
    isOpen,
    reportType: resolvedReportType,
  });

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

  const {
    currentSketchMode,
    sketchFeatureCount,
    isDrawingInProgress,
    triggerSketchAction,
    finalizeCurrentDrawing,
    getSketchFeatures,
    clearSession: clearSketchSession,
  } = useReportSketchSession({
    map,
    enabled: isOpen && isPickingSketch,
  });
  // Auto-finish is supported only for lines (double-tap is not obvious on mobile).
  // For other geometries, CTA requires already committed features.
  const canValidateSketch = sketchFeatureCount > 0 || (
    isDrawingInProgress &&
    currentSketchMode === 'draw-linestring'
  );

  const sketchToolItems = useMemo<MapToolbarItem[]>(() => {
    return SKETCH_TOOL_DEFINITIONS.map((definition) => {
      return {
        id: definition.id,
        Icon: definition.icon,
        label: t(definition.labelKey),
        active: definition.activeMode === currentSketchMode,
      };
    });
  }, [currentSketchMode, t]);

  const {
    isRecording: isTraceRecording,
    isPaused: isTracePaused,
    hasTrace: hasTraceInSession,
    tracePointCount,
    traceDistanceMeters,
    transportMode: traceTransportMode,
    isAudioEnabled: isTraceAudioEnabled,
    startRecording: startTraceRecording,
    togglePause: toggleTracePause,
    finalizeRecording: finalizeTraceRecording,
    toggleTransportMode: toggleTraceTransportMode,
    toggleAudio: toggleTraceAudio,
    clearSession: clearTraceSession,
  } = useReportTraceSession({
    map,
    enabled: isOpen && isPickingTrace,
  });

  const hasUnsavedChanges = form.isDirty ||
    selectedPosition !== null ||
    (isTraceReport && (isPickingTrace || hasTraceInSession));

  const closeMapPickers = useCallback(() => {
    setMapPickerMode('none');
    setObjectCandidates([]);
    setIsObjectChoiceOpen(false);
    clearSketchSession();
    clearTraceSession();
    onSearchPanelVisibilityChange?.(false);
  }, [clearSketchSession, clearTraceSession, onSearchPanelVisibilityChange]);

  const handleSketchToolClick = useCallback((toolId: string) => {
    if (toolId === 'close') {
      closeMapPickers();
      return;
    }

    const action = getSketchToolActionById(toolId);
    if (!action) return;

    triggerSketchAction(action);
  }, [closeMapPickers, triggerSketchAction]);

  const resetMapPickers = useCallback(() => {
    closeMapPickers();
    setSelectedPosition(null);
  }, [closeMapPickers]);

  const startMapPicker = useCallback((mode: Exclude<MapPickerMode, 'none'>) => {
    if (!map) return;

    if (position) {
      map.getView().animate({
        center: fromLonLat([position.coords.longitude, position.coords.latitude]),
        duration: 250,
      });
    }

    setObjectCandidates([]);
    setIsObjectChoiceOpen(false);
    setMapPickerMode(mode);
    onSearchPanelVisibilityChange?.(mode === 'position');
  }, [map, onSearchPanelVisibilityChange, position]);

  const handleStartPositionPicker = useCallback(() => {
    startMapPicker('position');
  }, [startMapPicker]);

  const handleStartObjectPicker = useCallback(() => {
    startMapPicker('object');
  }, [startMapPicker]);

  const handleStartSketchPicker = useCallback(() => {
    startMapPicker('sketch');
  }, [startMapPicker]);

  const handleStartTracePicker = useCallback(() => {
    startMapPicker('trace');
  }, [startMapPicker]);

  const handleViewReportPosition = useCallback(() => {
    startMapPicker('view-position');
  }, [startMapPicker]);

  const handleValidatePosition = useCallback(() => {
    if (!map) return;
    const center = map.getView().getCenter();
    if (!center) return;

    const [longitude, latitude] = toLonLat(center);
    const nextPosition = createPositionFromLonLat(longitude, latitude, { fallback: position });
    setSelectedPosition(nextPosition);
    closeMapPickers();
  }, [map, position, closeMapPickers]);

  const handleCloseObjectChoice = useCallback(() => {
    setObjectCandidates([]);
    setIsObjectChoiceOpen(false);
  }, []);

  const handleSelectObjectCandidate = useCallback((candidateKey: string) => {
    const selectedCandidate = objectCandidates.find((candidate) => candidate.key === candidateKey);
    if (!selectedCandidate) return;

    form.addObject(selectedCandidate.feature);
    closeMapPickers();
  }, [objectCandidates, form, closeMapPickers]);

  useEffect(() => {
    if (!isOpen || !map || !isPickingObject) return;
    const unknownLayerLabel = t('reports.createOrEdit.form.objectLayerUnknown');
    const defaultObjectLabel = t('reports.createOrEdit.form.objectDefaultName');
    const noObjectHitLabel = t('reports.createOrEdit.form.objectNoHit');

    const handleMapSingleClick = (event: MapBrowserEvent) => {
      const candidatesByKey = new Map<string, PickedMapObjectCandidate>();

      map.forEachFeatureAtPixel(
        event.pixel,
        (featureLike, layerLike) => {
          if (!(featureLike instanceof Feature)) return undefined;
          if (Array.isArray(featureLike.get('features'))) return undefined;

          const layer = layerLike as BaseLayer | null | undefined;
          if (!isSelectableReportObjectLayer(layer)) return undefined;

          const layerName = getLayerName(layer);
          const layerTitle = getLayerDisplayTitle(layer) ?? unknownLayerLabel;
          const objectKey = buildReportObjectKey(featureLike, layerName);

          if (candidatesByKey.has(objectKey)) {
            return undefined;
          }

          const feature = featureLike.clone();
          const featureId = featureLike.getId();
          if (featureId !== undefined) {
            feature.setId(featureId);
          }

          const objectLabel = getReportObjectLabel(featureLike) ?? defaultObjectLabel;
          applyReportObjectMetadata(feature, {
            key: objectKey,
            label: objectLabel,
            layerName,
            layerTitle,
          });

          candidatesByKey.set(objectKey, {
            key: objectKey,
            label: objectLabel,
            layerTitle,
            feature,
          });
          return undefined;
        },
        { hitTolerance: 10 }
      );

      const candidates = Array.from(candidatesByKey.values());

      if (candidates.length === 0) {
        void showToastSafe({
          text: noObjectHitLabel,
          duration: 'short',
          position: 'top',
        });
        return;
      }

      if (candidates.length === 1) {
        form.addObject(candidates[0].feature);
        closeMapPickers();
        return;
      }

      setObjectCandidates(candidates);
      setIsObjectChoiceOpen(true);
    };

    map.on('singleclick', handleMapSingleClick);

    return () => {
      map.un('singleclick', handleMapSingleClick);
    };
  }, [isOpen, isPickingObject, map, form, closeMapPickers, t]);

  const handleValidateSketch = useCallback(async () => {
    if (currentSketchMode === 'draw-linestring') {
      finalizeCurrentDrawing();
      // Let OL emit drawend/addfeature before reading the source snapshot.
      await Promise.resolve();
    }

    const sketchFeatures = getSketchFeatures();
    if (sketchFeatures.length === 0) return;

    form.addSketches(sketchFeatures);
    closeMapPickers();
  }, [closeMapPickers, currentSketchMode, finalizeCurrentDrawing, form, getSketchFeatures]);

  const handleValidateTrace = useCallback(() => {
    const traceFeatures = finalizeTraceRecording();
    const traceFeature = traceFeatures.find((feature) => {
      return feature.getGeometry()?.getType() === 'LineString';
    });

    if (!traceFeature) return;

    form.replaceSketches([traceFeature]);
    closeMapPickers();
  }, [closeMapPickers, finalizeTraceRecording, form]);

  const traceStatusText = useMemo(() => {
    if (isTraceRecording && !isTracePaused) {
      return t('reports.createOrEdit.traceToolbar.statusRecording', {
        pointCount: tracePointCount,
        distance: traceDistanceMeters,
      });
    }
    if (isTraceRecording && isTracePaused) {
      return t('reports.createOrEdit.traceToolbar.statusPaused', {
        pointCount: tracePointCount,
        distance: traceDistanceMeters,
      });
    }
    if (hasTraceInSession) {
      return t('reports.createOrEdit.traceToolbar.statusReady', {
        pointCount: tracePointCount,
        distance: traceDistanceMeters,
      });
    }
    return t('reports.createOrEdit.traceToolbar.statusIdle');
  }, [
    hasTraceInSession,
    isTracePaused,
    isTraceRecording,
    t,
    traceDistanceMeters,
    tracePointCount,
  ]);

  const {
    isLeaveAlertOpen,
    requestClose: handlePageClose,
    requestBack: handlePageBack,
    confirmLeave: handleConfirmLeave,
    cancelLeave: closeLeaveAlert,
  } = useUnsavedChangesGuard({
    hasUnsavedChanges,
    onClose,
    onBack,
    beforeLeave: resetMapPickers,
  });

  const handleSaveDraft = async () => {
    await form.saveDraft();
    closeMapPickers();
    onClose();
    await showToastSafe({
      text: t('reports.createOrEdit.actions.draftSaved'),
      duration: 'short',
      position: 'top',
    });
  };

  const handleSend = async () => {
    if (!form.validate()) return;
    setIsSendConfirmOpen(true);
  };

  const handleCloseSendConfirm = useCallback(() => {
    setIsSendConfirmOpen(false);
  }, []);

  const handleConfirmSend = async () => {
    if (form.isSaving) return;
    setIsSendConfirmOpen(false);
    const success = await form.submit();
    if (success) {
      setIsSendSuccessOpen(true);
    }
  };

  const handleCloseSendSuccess = useCallback(() => {
    setIsSendSuccessOpen(false);
    resetMapPickers();
    onClose();
  }, [onClose, resetMapPickers]);

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

  const submitErrorKey = getReportSubmitErrorTranslationKey(
    form.submitError,
    'reports.createOrEdit.actions.submitError'
  );

  const mapPickerOverlay = useMemo(() => {
    if (!isOpen) return null;

    if (isPickingPosition || isViewingPosition) {
      return (
        <div className={styles.locationPickerOverlay}>
          <div className={styles.locationTarget} aria-hidden="true">
            <IconAdd className={styles.locationTargetIcon} />
          </div>
          <div className={styles.validateButtonContainer}>
            <Button
              color="primary"
              onClick={isViewingPosition ? closeMapPickers : handleValidatePosition}
              className={styles.validateButton}
            >
              {isViewingPosition
                ? t('reports.createOrEdit.actions.backToReport')
                : t('reports.createOrEdit.actions.validatePosition')}
            </Button>
          </div>
        </div>
      );
    }

    if (isPickingObject) {
      return (
        <div className={styles.locationPickerOverlay}>
          {/* <div className={styles.objectPickerHint}>
            {t('reports.createOrEdit.form.objectPickInstruction')}
          </div> */}
          <div className={styles.validateButtonContainer}>
            <Button
              color="medium"
              variant="outline"
              onClick={closeMapPickers}
              className={styles.validateButton}
            >
              {t('reports.createOrEdit.actions.cancel')}
            </Button>
          </div>
        </div>
      );
    }

    if (isPickingSketch) {
      return (
        <div className={styles.locationPickerOverlay}>
          <div className={styles.sketchToolboxWrapper}>
            <MapToolbar
              items={sketchToolItems}
              onItemClick={handleSketchToolClick}
              statusText={t('reports.createOrEdit.form.sketchCount', { count: sketchFeatureCount })}
            />
          </div>

          <div className={styles.validateButtonContainer}>
            <Button
              color="primary"
              onClick={handleValidateSketch}
              className={styles.validateButton}
              disabled={!canValidateSketch}
            >
              {t('reports.createOrEdit.form.sketchAddToReport')}
            </Button>
          </div>
        </div>
      );
    }

    if (isPickingTrace) {
      return (
        <TraceToolbar
          isRecording={isTraceRecording}
          isPaused={isTracePaused}
          hasTrace={hasTraceInSession}
          canValidate={hasTraceInSession}
          transportMode={traceTransportMode}
          isAudioEnabled={isTraceAudioEnabled}
          statusText={traceStatusText}
          onStartRecording={startTraceRecording}
          onTogglePause={toggleTracePause}
          onToggleTransportMode={toggleTraceTransportMode}
          onToggleAudio={toggleTraceAudio}
          onValidate={handleValidateTrace}
          onCancel={closeMapPickers}
        />
      );
    }

    return null;
  }, [
    canValidateSketch,
    closeMapPickers,
    handleSketchToolClick,
    handleValidatePosition,
    handleValidateSketch,
    handleValidateTrace,
    hasTraceInSession,
    isOpen,
    isPickingObject,
    isPickingPosition,
    isPickingSketch,
    isPickingTrace,
    isViewingPosition,
    isTraceAudioEnabled,
    isTracePaused,
    isTraceRecording,
    startTraceRecording,
    sketchFeatureCount,
    sketchToolItems,
    toggleTraceAudio,
    toggleTracePause,
    toggleTraceTransportMode,
    t,
    traceStatusText,
    traceTransportMode,
  ]);

  return (
    <>
      <SlideUpPage
        isOpen={isOpen}
        onClose={handlePageClose}
        level={level}
        className={isPickingOnMap ? styles.locationPickerSheet : undefined}
      >
        <PageHeader
          title={headerTitle}
          subtitle={activeCommunity?.name ?? t('reports.createOrEdit.headerSubtitle')}
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
            isTraceMode={isTraceReport}
            onViewReportPosition={canViewReportPosition ? handleViewReportPosition : undefined}
            onEditPosition={canEditPosition ? handleStartPositionPicker : undefined}
            onAddObject={canPickObjects ? handleStartObjectPicker : undefined}
            onAddSketch={canPickSketches ? handleStartSketchPicker : undefined}
            onAddTrace={canPickTrace ? handleStartTracePicker : undefined}
            isPickingObject={isPickingObject}
            isPickingSketch={isPickingSketch}
            isPickingTrace={isPickingTrace}
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
              onClick={handlePageBack}
            >
              <IconClose className={buttonStyles.icon} />
              {t('reports.createOrEdit.actions.cancel')}
            </Button>
          </div>

          {form.submitError && (
            <p className={styles.submitError}>
              {t(submitErrorKey)}
            </p>
          )}
        </main>
      </SlideUpPage>

      {mapPickerOverlay && typeof document !== 'undefined'
        ? createPortal(mapPickerOverlay, document.body)
        : null}

      <Alert
        isOpen={isObjectChoiceOpen}
        onClose={handleCloseObjectChoice}
        title={t('reports.createOrEdit.form.objectChooseTitle')}
        subtitle={t('reports.createOrEdit.form.objectChooseSubtitle', {
          count: objectCandidates.length,
        })}
        buttons={[
          {
            label: t('reports.createOrEdit.actions.cancel'),
            onClick: handleCloseObjectChoice,
            variant: 'outline',
          },
        ]}
      >
        <div className={styles.objectChoiceList}>
          {objectCandidates.map((candidate) => (
            <button
              key={candidate.key}
              type="button"
              className={styles.objectChoiceButton}
              onClick={() => handleSelectObjectCandidate(candidate.key)}
            >
              <span className={styles.objectChoiceLabel}>{candidate.label}</span>
              <span className={styles.objectChoiceLayer}>{candidate.layerTitle}</span>
            </button>
          ))}
        </div>
      </Alert>

      <Alert
        isOpen={isSendConfirmOpen}
        onClose={handleCloseSendConfirm}
        title={t('reports.createOrEdit.sendConfirmation.title')}
        subtitle={t('reports.createOrEdit.sendConfirmation.message')}
        buttons={[
          {
            label: t('reports.createOrEdit.actions.send'),
            onClick: handleConfirmSend,
            color: 'primary',
          },
          {
            label: t('reports.createOrEdit.actions.cancel'),
            onClick: handleCloseSendConfirm,
            variant: 'outline',
          },
        ]}
      />

      <Alert
        isOpen={isSendSuccessOpen}
        onClose={handleCloseSendSuccess}
        title={t('reports.createOrEdit.sendSuccess.title')}
        subtitle={t('reports.createOrEdit.sendSuccess.message')}
        buttons={[
          {
            label: t('reports.general.ok'),
            onClick: handleCloseSendSuccess,
            color: 'primary',
          },
        ]}
      />

      <Alert
        isOpen={isLeaveAlertOpen}
        onClose={closeLeaveAlert}
        title={t('reports.createOrEdit.unsavedChanges.title')}
        subtitle={t('reports.createOrEdit.unsavedChanges.message')}
        buttons={[
          {
            label: t('reports.createOrEdit.unsavedChanges.leaveButton'),
            onClick: handleConfirmLeave,
            color: 'danger',
          },
          {
            label: t('reports.createOrEdit.unsavedChanges.stayButton'),
            onClick: closeLeaveAlert,
            variant: 'outline',
          },
        ]}
      />
    </>
  );
}
