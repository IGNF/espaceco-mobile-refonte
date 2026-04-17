import { useTranslation } from 'react-i18next';

import type { CommunityLayer } from '@ign/mobile-core';

import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import { Checkbox } from '@/shared/ui/Checkbox';
import { Toggle } from '@/shared/ui/Toggle';

import type { OfflineZone, RasterScaleOption } from '@/domain/offline/models';

import type { OfflineZoneEditorMode } from '@/domain/offline/models';

import { getCommunityLayerKey } from '@/shared/utils/layerKey';
import { getCommunityLayerTitle } from '@/shared/utils/communityLayer';

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
  onCloseLayerPicker: () => void;
  onToggleAllLayerPickerLayers: (checked: boolean) => void;
  onToggleLayerPickerKey: (layerKey: string) => void;
  onValidateLayerPicker: () => void;
  isLoadZoneDialogOpen: boolean;
  zones: OfflineZone[];
  onCloseLoadZoneDialog: () => void;
  onLoadCacheForZone: (zoneName: string) => void;
  isNewRasterMapDialogOpen: boolean;
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
  rasterZoneDialogMode: 'load' | 'append' | null;
  rasterZoneDialogSubtitle?: string;
  rasterZoneDialogZones: OfflineZone[];
  onCloseRasterZoneDialog: () => void;
  onSelectRasterZone: (zoneName: string) => void;
  isDeleteAlertOpen: boolean;
  deleteAlertTitle: string;
  deleteAlertSubtitle: string;
  onCloseDeleteAlert: () => void;
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
  onCloseLayerPicker,
  onToggleAllLayerPickerLayers,
  onToggleLayerPickerKey,
  onValidateLayerPicker,
  isLoadZoneDialogOpen,
  zones,
  onCloseLoadZoneDialog,
  onLoadCacheForZone,
  isNewRasterMapDialogOpen,
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
  onCloseRasterZoneDialog,
  onSelectRasterZone,
  isDeleteAlertOpen,
  deleteAlertTitle,
  deleteAlertSubtitle,
  onCloseDeleteAlert,
  onConfirmDeleteAlert,
}: OfflineDialogsProps) {
  const { t } = useTranslation();

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
        onClose={onCloseLayerPicker}
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
                />
              );
            })}
          </div>

          <div className={styles.dialogActions}>
            <Button
              variant='outline'
              color='secondary'
              onClick={onCloseLayerPicker}
            >
              {t('offline.dialog.cancel')}
            </Button>
            <Button onClick={onValidateLayerPicker}>
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
            />
          </label>

          <label className={inputs.field}>
            <span className={inputs.label}>{t('offline.raster.layerLabel')}</span>
            <select
              className={inputs.select}
              value={newRasterMapLayerName}
              onChange={(event) => onChangeNewRasterMapLayerName(event.target.value)}
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
            >
              {t('offline.dialog.cancel')}
            </Button>
            <Button
              onClick={onValidateNewRasterMap}
              disabled={newRasterMapName.trim().length === 0}
            >
              {t('offline.dialog.validate')}
            </Button>
          </div>
        </div>
      </Alert>

      <Alert
        isOpen={isRasterZoneDialogOpen}
        onClose={onCloseRasterZoneDialog}
        title={
          rasterZoneDialogMode === 'append'
            ? t('offline.raster.chooseZoneToAdd')
            : t('offline.raster.chooseZoneToLoad')
        }
        subtitle={rasterZoneDialogSubtitle}
      >
        <div className={styles.dialogContent}>
          <div className={styles.dialogList}>
            {rasterZoneDialogZones.map((zone) => (
              <Button
                key={zone.name}
                fullWidth
                variant='outline'
                color='secondary'
                onClick={() => onSelectRasterZone(zone.name)}
              >
                {zone.name}
              </Button>
            ))}
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
          },
          {
            label: t('offline.dialog.cancel'),
            onClick: onCloseDeleteAlert,
            variant: 'outline',
          },
        ]}
      />
    </>
  );
}
