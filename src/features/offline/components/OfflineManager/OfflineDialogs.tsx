import { useTranslation } from 'react-i18next';

import type { CommunityLayer } from '@ign/mobile-core';

import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import { Checkbox } from '@/shared/ui/Checkbox';
import { Loading } from '@/shared/ui/Loading';
import { Toggle } from '@/shared/ui/Toggle';

import type {
  OfflineRasterDownloadPreview,
  OfflineZone,
  RasterScaleOption,
} from '@/domain/offline/models';

import type { OfflineZoneEditorMode } from '@/domain/offline/models';

import { getCommunityLayerKey } from '@/shared/utils/layerKey';
import { getCommunityLayerTitle } from '@/shared/utils/communityLayer';
import { formatDurationFromMs } from '@/shared/utils/date';

import inputs from '@/shared/styles/inputs.module.css';
import typography from '@/shared/styles/typography.module.css';

import styles from '@/features/offline/pages/OfflineManagementPage.module.css';

interface OfflineDialogsProps {
  isNewZoneDialogOpen: boolean;
  newZoneName: string;
  newZoneMode: OfflineZoneEditorMode;
  newZoneLayerKey: string;
  hasPolygonLayer: boolean;
  polygonLayers: CommunityLayer[];
  onCloseNewZoneDialog: () => void;
  onChangeNewZoneName: (value: string) => void;
  onChangeNewZoneMode: (mode: OfflineZoneEditorMode) => void;
  onChangeNewZoneLayerKey: (layerKey: string) => void;
  onStartZoneEditor: () => void;
  layerPickerMode: 'draft-cache' | 'loaded-cache' | null;
  addableLayers: CommunityLayer[];
  eligibleLayers: CommunityLayer[];
  layerPickerLayers: CommunityLayer[];
  layerPickerKeys: string[];
  areAllLayerPickerLayersSelected: boolean;
  isLayerPickerSubmitting: boolean;
  onCloseLayerPicker: () => void;
  onToggleAllLayerPickerLayers: (checked: boolean) => void;
  onToggleLayerPickerKey: (layerKey: string) => void;
  onValidateLayerPicker: () => void;
  isLoadZoneDialogOpen: boolean;
  zones: OfflineZone[];
  onCloseLoadZoneDialog: () => void;
  onLoadCacheForZone: (zoneName: string) => void;
  isNewRasterMapDialogOpen: boolean;
  isNewRasterMapSubmitting: boolean;
  newRasterMapName: string;
  newRasterMapLayerName: string;
  newRasterMapMinZoom: number;
  newRasterMapMaxZoom: number;
  geoportailLayerOptions: Array<{ name: string; title: string }>;
  rasterScaleOptions: RasterScaleOption[];
  isExpertMode: boolean;
  onCloseNewRasterMapDialog: () => void;
  onChangeNewRasterMapName: (value: string) => void;
  onChangeNewRasterMapLayerName: (value: string) => void;
  onChangeNewRasterMapMinZoom: (value: number) => void;
  onChangeNewRasterMapMaxZoom: (value: number) => void;
  onValidateNewRasterMap: () => void;
  isRasterZoneDialogOpen: boolean;
  rasterZoneDialogMode: 'load-map' | 'add-zone' | 'pending-maps' | null;
  rasterZoneDialogSubtitle?: string;
  rasterZoneDialogZones: OfflineZone[];
  isRasterPreviewLoading: boolean;
  rasterDownloadPreview: OfflineRasterDownloadPreview | null;
  rasterDownloadPreviewMapName: string | null;
  rasterDownloadPreviewZoneName: string | null;
  onCloseRasterZoneDialog: () => void;
  onSelectRasterZone: (zoneName: string) => void;
  onCloseRasterDownloadPreview: () => void;
  onConfirmRasterDownloadPreview: () => void;
  isRenameRasterMapDialogOpen: boolean;
  rasterMapRenameName: string;
  isRenameRasterMapSubmitting: boolean;
  onCloseRenameRasterMapDialog: () => void;
  onChangeRasterMapRenameName: (value: string) => void;
  onConfirmRenameRasterMap: () => void;
  isDeleteAlertOpen: boolean;
  deleteAlertTitle: string;
  deleteAlertSubtitle: string;
  onCloseDeleteAlert: () => void;
  isDeleteAlertProcessing: boolean;
  onConfirmDeleteAlert: () => void;
}

export function OfflineDialogs({
  isNewZoneDialogOpen,
  newZoneName,
  newZoneMode,
  newZoneLayerKey,
  hasPolygonLayer,
  polygonLayers,
  onCloseNewZoneDialog,
  onChangeNewZoneName,
  onChangeNewZoneMode,
  onChangeNewZoneLayerKey,
  onStartZoneEditor,
  layerPickerMode,
  addableLayers,
  eligibleLayers,
  layerPickerLayers,
  layerPickerKeys,
  areAllLayerPickerLayersSelected,
  isLayerPickerSubmitting,
  onCloseLayerPicker,
  onToggleAllLayerPickerLayers,
  onToggleLayerPickerKey,
  onValidateLayerPicker,
  isLoadZoneDialogOpen,
  zones,
  onCloseLoadZoneDialog,
  onLoadCacheForZone,
  isNewRasterMapDialogOpen,
  isNewRasterMapSubmitting,
  newRasterMapName,
  newRasterMapLayerName,
  newRasterMapMinZoom,
  newRasterMapMaxZoom,
  geoportailLayerOptions,
  rasterScaleOptions,
  isExpertMode,
  onCloseNewRasterMapDialog,
  onChangeNewRasterMapName,
  onChangeNewRasterMapLayerName,
  onChangeNewRasterMapMinZoom,
  onChangeNewRasterMapMaxZoom,
  onValidateNewRasterMap,
  isRasterZoneDialogOpen,
  rasterZoneDialogMode,
  rasterZoneDialogSubtitle,
  rasterZoneDialogZones,
  isRasterPreviewLoading,
  rasterDownloadPreview,
  rasterDownloadPreviewMapName,
  rasterDownloadPreviewZoneName,
  onCloseRasterZoneDialog,
  onSelectRasterZone,
  onCloseRasterDownloadPreview,
  onConfirmRasterDownloadPreview,
  isRenameRasterMapDialogOpen,
  rasterMapRenameName,
  isRenameRasterMapSubmitting,
  onCloseRenameRasterMapDialog,
  onChangeRasterMapRenameName,
  onConfirmRenameRasterMap,
  isDeleteAlertOpen,
  deleteAlertTitle,
  deleteAlertSubtitle,
  onCloseDeleteAlert,
  isDeleteAlertProcessing,
  onConfirmDeleteAlert,
}: OfflineDialogsProps) {
  const { t } = useTranslation();
  let rasterZoneDialogTitle = t('offline.raster.chooseZoneToLoad');

  if (rasterZoneDialogMode === 'pending-maps') {
    rasterZoneDialogTitle = t('offline.raster.chooseZoneForPending');
  }
  else if (rasterZoneDialogMode === 'add-zone') {
    rasterZoneDialogTitle = t('offline.raster.chooseZoneToAdd');
  }

  return (
    <>
      <Alert
        isOpen={isNewZoneDialogOpen}
        onClose={onCloseNewZoneDialog}
        title={t('offline.zones.newZoneDialogTitle')}
      >
        <div className={styles.dialogContent}>
          <label className={inputs.field}>
            <span className={inputs.label}>{t('offline.zones.nameLabel')}</span>
            <input
              type='text'
              className={inputs.input}
              value={newZoneName}
              onChange={(event) => onChangeNewZoneName(event.target.value)}
              placeholder={t('offline.zones.namePlaceholder')}
            />
          </label>

          <fieldset className={styles.fieldset}>
            <legend className={`${inputs.label} ${styles.legend}`}>
              {t('offline.zones.definitionType')}
            </legend>

            <label className={styles.radioOption}>
              <input
                type='radio'
                checked={newZoneMode === 'custom'}
                onChange={() => onChangeNewZoneMode('custom')}
              />
              <span>{t('offline.zones.customMode')}</span>
            </label>

            <label className={styles.radioOption}>
              <input
                type='radio'
                checked={newZoneMode === 'select-obj'}
                onChange={() => onChangeNewZoneMode('select-obj')}
                disabled={!hasPolygonLayer}
              />
              <span>{t('offline.zones.objectMode')}</span>
            </label>
          </fieldset>

          {newZoneMode === 'select-obj' && (
            <>
              {!hasPolygonLayer ? (
                <p className={typography.caption}>{t('offline.zones.noPolygonLayer')}</p>
              ) : (
                <label className={inputs.field}>
                  <span className={inputs.label}>{t('offline.zones.layerLabel')}</span>
                  <select
                    className={inputs.select}
                    value={newZoneLayerKey}
                    onChange={(event) => onChangeNewZoneLayerKey(event.target.value)}
                  >
                    {polygonLayers.map((layer) => (
                      <option
                        key={getCommunityLayerKey(layer)}
                        value={getCommunityLayerKey(layer)}
                      >
                        {getCommunityLayerTitle(layer)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </>
          )}

          <div className={styles.dialogActions}>
            <Button
              variant='outline'
              color='secondary'
              onClick={onCloseNewZoneDialog}
            >
              {t('offline.dialog.cancel')}
            </Button>
            <Button
              onClick={onStartZoneEditor}
              disabled={
                newZoneName.trim().length === 0 ||
                (newZoneMode === 'select-obj' && !newZoneLayerKey)
              }
            >
              {t('offline.dialog.continue')}
            </Button>
          </div>
        </div>
      </Alert>

      <Alert
        isOpen={layerPickerMode !== null}
        onClose={isLayerPickerSubmitting ? () => undefined : onCloseLayerPicker}
        title={t('offline.cache.addLayers')}
        subtitle={
          layerPickerMode === 'loaded-cache'
            ? t('offline.layers.appendWarning')
            : undefined
        }
      >
        <div className={styles.dialogContent}>
          {layerPickerMode === 'loaded-cache' && addableLayers.length === 0 && (
            <p className={typography.caption}>{t('offline.layers.noAddableLayer')}</p>
          )}

          {layerPickerMode === 'draft-cache' && eligibleLayers.length === 0 && (
            <p className={typography.caption}>{t('offline.layers.empty')}</p>
          )}

          <div className={styles.dialogList}>
            {layerPickerLayers.length > 0 && (
              <div className={styles.dialogToggle}>
                <Toggle
                  checked={areAllLayerPickerLayersSelected}
                  onChange={onToggleAllLayerPickerLayers}
                  label={t('offline.layers.selectAll')}
                  color='primary'
                  disabled={isLayerPickerSubmitting}
                />
              </div>
            )}

            {layerPickerLayers.map((layer) => {
              const layerKey = getCommunityLayerKey(layer);

              return (
                <Checkbox
                  key={layerKey}
                  label={getCommunityLayerTitle(layer)}
                  checked={layerPickerKeys.includes(layerKey)}
                  onChange={() => onToggleLayerPickerKey(layerKey)}
                  disabled={isLayerPickerSubmitting}
                />
              );
            })}
          </div>

          <div className={styles.dialogActions}>
            <Button
              variant='outline'
              color='secondary'
              onClick={onCloseLayerPicker}
              disabled={isLayerPickerSubmitting}
            >
              {t('offline.dialog.cancel')}
            </Button>
            <Button
              onClick={onValidateLayerPicker}
              loading={isLayerPickerSubmitting}
            >
              {t('offline.dialog.validate')}
            </Button>
          </div>
        </div>
      </Alert>

      <Alert
        isOpen={isLoadZoneDialogOpen}
        onClose={onCloseLoadZoneDialog}
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
                onClick={() => onLoadCacheForZone(zone.name)}
              >
                {zone.name}
              </Button>
            ))}
          </div>
        </div>
      </Alert>

      <Alert
        isOpen={isNewRasterMapDialogOpen}
        onClose={onCloseNewRasterMapDialog}
        title={t('offline.raster.newMapDialogTitle')}
      >
        <div className={styles.dialogContent}>
          <label className={inputs.field}>
            <span className={inputs.label}>{t('offline.raster.nameLabel')}</span>
            <input
              type='text'
              className={inputs.input}
              value={newRasterMapName}
              onChange={(event) => onChangeNewRasterMapName(event.target.value)}
              placeholder={t('offline.raster.namePlaceholder')}
              disabled={isNewRasterMapSubmitting}
            />
          </label>

          <label className={inputs.field}>
            <span className={inputs.label}>{t('offline.raster.layerLabel')}</span>
            <select
              className={inputs.select}
              value={newRasterMapLayerName}
              onChange={(event) => onChangeNewRasterMapLayerName(event.target.value)}
              disabled={isNewRasterMapSubmitting}
            >
              {geoportailLayerOptions.map((layerOption) => (
                <option key={layerOption.name} value={layerOption.name}>
                  {layerOption.title}
                </option>
              ))}
            </select>
          </label>

          <div className={styles.dialogGrid}>
            {isExpertMode && (
              <label className={inputs.field}>
                <span className={inputs.label}>{t('offline.raster.minZoom')}</span>
                <select
                  className={inputs.select}
                  value={newRasterMapMinZoom}
                  onChange={(event) => onChangeNewRasterMapMinZoom(Number(event.target.value))}
                  disabled={isNewRasterMapSubmitting}
                >
                  {rasterScaleOptions.map((scaleOption) => (
                    <option key={scaleOption.value} value={scaleOption.value}>
                      {scaleOption.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className={inputs.field}>
              <span className={inputs.label}>{t('offline.raster.maxZoom')}</span>
              <select
                className={inputs.select}
                value={newRasterMapMaxZoom}
                onChange={(event) => onChangeNewRasterMapMaxZoom(Number(event.target.value))}
                disabled={isNewRasterMapSubmitting}
              >
                {rasterScaleOptions.map((scaleOption) => (
                  <option key={scaleOption.value} value={scaleOption.value}>
                    {scaleOption.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className={styles.dialogActions}>
            <Button
              variant='outline'
              color='secondary'
              onClick={onCloseNewRasterMapDialog}
              disabled={isNewRasterMapSubmitting}
            >
              {t('offline.dialog.cancel')}
            </Button>
            <Button
              onClick={onValidateNewRasterMap}
              disabled={newRasterMapName.trim().length === 0}
              loading={isNewRasterMapSubmitting}
            >
              {t('offline.dialog.validate')}
            </Button>
          </div>
        </div>
      </Alert>

      <Alert
        isOpen={isRasterZoneDialogOpen}
        onClose={isRasterPreviewLoading ? () => undefined : onCloseRasterZoneDialog}
        title={rasterZoneDialogTitle}
        subtitle={rasterZoneDialogSubtitle}
      >
        <div className={styles.dialogContent}>
          {isRasterPreviewLoading && (
            <Loading
              size='small'
              label={t('offline.raster.previewLoading')}
            />
          )}

          <div className={styles.dialogList}>
            {rasterZoneDialogZones.map((zone) => (
              <Button
                key={zone.name}
                fullWidth
                variant='outline'
                color='secondary'
                disabled={isRasterPreviewLoading}
                onClick={() => onSelectRasterZone(zone.name)}
              >
                {zone.name}
              </Button>
            ))}
          </div>
        </div>
      </Alert>

      {/* Preview the raster download before the user starts the real tile download. */}
      <Alert
        isOpen={rasterDownloadPreview !== null}
        onClose={onCloseRasterDownloadPreview}
        title={t('offline.raster.previewTitle')}
        subtitle={t('offline.raster.previewSubtitle', {
          map: rasterDownloadPreviewMapName,
          zone: rasterDownloadPreviewZoneName,
        })}
        buttons={[
          {
            label: t('offline.raster.download'),
            onClick: onConfirmRasterDownloadPreview,
          },
          {
            label: t('offline.dialog.cancel'),
            onClick: onCloseRasterDownloadPreview,
            variant: 'outline',
          },
        ]}
      >
        {rasterDownloadPreview && (
          <div className={styles.dialogContent}>
            <span className={typography.body}>
              {t('offline.raster.previewTileCount', {
                count: rasterDownloadPreview.tileCount,
              })}
            </span>
            <span className={typography.body}>
              {t('offline.raster.previewSize', {
                value: rasterDownloadPreview.estimatedSizeMb.toLocaleString('fr-FR', {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                }),
              })}
            </span>
            <span className={typography.body}>
              {t('offline.raster.previewTime', {
                value: formatDurationFromMs(rasterDownloadPreview.estimatedTimeMs),
              })}
            </span>
            {rasterDownloadPreview.freeDiskSpaceMb != null && (
              <span className={typography.body}>
                {t('offline.raster.previewFreeSpace', {
                  value: rasterDownloadPreview.freeDiskSpaceMb.toLocaleString('fr-FR', {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  }),
                })}
              </span>
            )}
          </div>
        )}
      </Alert>

      <Alert
        isOpen={isRenameRasterMapDialogOpen}
        onClose={isRenameRasterMapSubmitting ? () => undefined : onCloseRenameRasterMapDialog}
        title={t('offline.raster.renameTitle')}
      >
        <div className={styles.dialogContent}>
          <label className={inputs.field}>
            <span className={inputs.label}>{t('offline.raster.nameLabel')}</span>
            <input
              type='text'
              className={inputs.input}
              value={rasterMapRenameName}
              onChange={(event) => onChangeRasterMapRenameName(event.target.value)}
              disabled={isRenameRasterMapSubmitting}
            />
          </label>

          <div className={styles.dialogActions}>
            <Button
              variant='outline'
              color='secondary'
              onClick={onCloseRenameRasterMapDialog}
              disabled={isRenameRasterMapSubmitting}
            >
              {t('offline.dialog.cancel')}
            </Button>
            <Button
              onClick={onConfirmRenameRasterMap}
              disabled={rasterMapRenameName.trim().length === 0}
              loading={isRenameRasterMapSubmitting}
            >
              {t('offline.dialog.validate')}
            </Button>
          </div>
        </div>
      </Alert>

      <Alert
        isOpen={isDeleteAlertOpen}
        onClose={onCloseDeleteAlert}
        title={deleteAlertTitle}
        subtitle={deleteAlertSubtitle}
        buttons={[
          {
            label: t('offline.dialog.delete'),
            onClick: onConfirmDeleteAlert,
            color: 'danger',
            loading: isDeleteAlertProcessing,
          },
          {
            label: t('offline.dialog.cancel'),
            onClick: onCloseDeleteAlert,
            variant: 'outline',
            disabled: isDeleteAlertProcessing,
          },
        ]}
      />
    </>
  );
}
