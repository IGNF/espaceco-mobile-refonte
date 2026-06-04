import { useTranslation } from 'react-i18next';
import type { CommunityLayer } from '@ign/mobile-core';
import type { OfflineZoneEditorMode } from '@/domain/offline/models';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import { getCommunityLayerTitle } from '@/shared/utils/communityLayer';
import { getCommunityLayerKey } from '@/shared/utils/layerKey';
import inputs from '@/shared/styles/inputs.module.css';
import typography from '@/shared/styles/typography.module.css';
import styles from '@/features/offline/pages/OfflineManagementPage.module.css';

interface NewZoneDialogProps {
  isOpen: boolean;
  name: string;
  mode: OfflineZoneEditorMode;
  layerKey: string;
  hasPolygonLayer: boolean;
  polygonLayers: CommunityLayer[];
  onClose: () => void;
  onChangeName: (value: string) => void;
  onChangeMode: (mode: OfflineZoneEditorMode) => void;
  onChangeLayerKey: (layerKey: string) => void;
  onContinue: () => void;
}

export function NewZoneDialog({
  isOpen,
  name,
  mode,
  layerKey,
  hasPolygonLayer,
  polygonLayers,
  onClose,
  onChangeName,
  onChangeMode,
  onChangeLayerKey,
  onContinue,
}: NewZoneDialogProps) {
  const { t } = useTranslation();

  return (
    <Alert
      isOpen={isOpen}
      onClose={onClose}
      title={t('offline.zones.newZoneDialogTitle')}
    >
      <div className={styles.dialogContent}>
        <label className={inputs.field}>
          <span className={inputs.label}>{t('offline.zones.nameLabel')}</span>
          <input
            type='text'
            className={inputs.input}
            value={name}
            onChange={(event) => onChangeName(event.target.value)}
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
              checked={mode === 'custom'}
              onChange={() => onChangeMode('custom')}
            />
            <span>{t('offline.zones.customMode')}</span>
          </label>

          <label className={styles.radioOption}>
            <input
              type='radio'
              checked={mode === 'select-obj'}
              onChange={() => onChangeMode('select-obj')}
              disabled={!hasPolygonLayer}
            />
            <span>{t('offline.zones.objectMode')}</span>
          </label>
        </fieldset>

        {mode === 'select-obj' && (
          <>
            {!hasPolygonLayer ? (
              <p className={typography.caption}>{t('offline.zones.noPolygonLayer')}</p>
            ) : (
              <label className={inputs.field}>
                <span className={inputs.label}>{t('offline.zones.layerLabel')}</span>
                <select
                  className={inputs.select}
                  value={layerKey}
                  onChange={(event) => onChangeLayerKey(event.target.value)}
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
            color='medium'
            onClick={onClose}
          >
            {t('offline.dialog.cancel')}
          </Button>
          <Button
            onClick={onContinue}
            disabled={name.trim().length === 0 || (mode === 'select-obj' && !layerKey)}
          >
            {t('offline.dialog.continue')}
          </Button>
        </div>
      </div>
    </Alert>
  );
}
