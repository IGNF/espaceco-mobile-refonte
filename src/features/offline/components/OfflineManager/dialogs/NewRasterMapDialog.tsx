import { useTranslation } from 'react-i18next';
import type { RasterScaleOption } from '@/domain/offline/models';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import inputs from '@/shared/styles/inputs.module.css';
import styles from '@/features/offline/pages/OfflineManagementPage.module.css';
import type { DisplayMode } from '@/domain/user/models';

interface NewRasterMapDialogProps {
  isOpen: boolean;
  isSubmitting: boolean;
  name: string;
  layerName: string;
  minZoom: number;
  maxZoom: number;
  geoportailLayerOptions: Array<{ name: string; title: string }>;
  rasterScaleOptions: RasterScaleOption[];
  displayMode: DisplayMode;
  onClose: () => void;
  onChangeName: (value: string) => void;
  onChangeLayerName: (value: string) => void;
  onChangeMinZoom: (value: number) => void;
  onChangeMaxZoom: (value: number) => void;
  onValidate: () => void;
}

export function NewRasterMapDialog({
  isOpen,
  isSubmitting,
  name,
  layerName,
  minZoom,
  maxZoom,
  geoportailLayerOptions,
  rasterScaleOptions,
  displayMode,
  onClose,
  onChangeName,
  onChangeLayerName,
  onChangeMinZoom,
  onChangeMaxZoom,
  onValidate,
}: NewRasterMapDialogProps) {
  const { t } = useTranslation();

  return (
    <Alert
      isOpen={isOpen}
      onClose={onClose}
      title={t('offline.raster.newMapDialogTitle')}
    >
      <div className={styles.dialogContent}>
        <label className={inputs.field}>
          <span className={inputs.label}>{t('offline.raster.nameLabel')}</span>
          <input
            type='text'
            className={inputs.input}
            value={name}
            onChange={(event) => onChangeName(event.target.value)}
            placeholder={t('offline.raster.namePlaceholder')}
            disabled={isSubmitting}
          />
        </label>

        <label className={inputs.field}>
          <span className={inputs.label}>{t('offline.raster.layerLabel')}</span>
          <select
            className={inputs.select}
            value={layerName}
            onChange={(event) => onChangeLayerName(event.target.value)}
            disabled={isSubmitting}
          >
            {geoportailLayerOptions.map((layerOption) => (
              <option key={layerOption.name} value={layerOption.name}>
                {layerOption.title}
              </option>
            ))}
          </select>
        </label>

        <div className={styles.dialogGrid}>
          {displayMode === 'expert' && (
            <label className={inputs.field}>
              <span className={inputs.label}>{t('offline.raster.minZoom')}</span>
              <select
                className={inputs.select}
                value={minZoom}
                onChange={(event) => onChangeMinZoom(Number(event.target.value))}
                disabled={isSubmitting}
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
              value={maxZoom}
              onChange={(event) => onChangeMaxZoom(Number(event.target.value))}
              disabled={isSubmitting}
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
            color='medium'
            onClick={onClose}
            disabled={isSubmitting}
          >
            {t('offline.dialog.cancel')}
          </Button>
          <Button
            onClick={onValidate}
            disabled={name.trim().length === 0}
            loading={isSubmitting}
          >
            {t('offline.dialog.validate')}
          </Button>
        </div>
      </div>
    </Alert>
  );
}
