import { useTranslation } from 'react-i18next';
import type { CommunityLayer } from '@ign/mobile-core';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import { Checkbox } from '@/shared/ui/Checkbox';
import { Toggle } from '@/shared/ui/Toggle';
import { getCommunityLayerTitle } from '@/shared/utils/communityLayer';
import { getCommunityLayerKey } from '@/shared/utils/layerKey';
import typography from '@/shared/styles/typography.module.css';
import styles from '@/features/offline/pages/OfflineManagementPage.module.css';

interface LayerPickerDialogProps {
  mode: 'draft-cache' | 'loaded-cache' | null;
  addableLayers: CommunityLayer[];
  eligibleLayers: CommunityLayer[];
  layers: CommunityLayer[];
  selectedKeys: string[];
  areAllLayersSelected: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onToggleAllLayers: (checked: boolean) => void;
  onToggleLayer: (layerKey: string) => void;
  onValidate: () => void;
}

export function LayerPickerDialog({
  mode,
  addableLayers,
  eligibleLayers,
  layers,
  selectedKeys,
  areAllLayersSelected,
  isSubmitting,
  onClose,
  onToggleAllLayers,
  onToggleLayer,
  onValidate,
}: LayerPickerDialogProps) {
  const { t } = useTranslation();

  return (
    <Alert
      isOpen={mode !== null}
      onClose={isSubmitting ? () => undefined : onClose}
      title={t('offline.cache.addLayers')}
      subtitle={mode === 'loaded-cache' ? t('offline.layers.appendWarning') : undefined}
    >
      <div className={styles.dialogContent}>
        {mode === 'loaded-cache' && addableLayers.length === 0 && (
          <p className={typography.caption}>{t('offline.layers.noAddableLayer')}</p>
        )}

        {mode === 'draft-cache' && eligibleLayers.length === 0 && (
          <p className={typography.caption}>{t('offline.layers.empty')}</p>
        )}

        <div className={styles.dialogList}>
          {layers.length > 0 && (
            <div className={styles.dialogToggle}>
              <Toggle
                checked={areAllLayersSelected}
                onChange={onToggleAllLayers}
                label={t('offline.layers.selectAll')}
                color='primary'
                disabled={isSubmitting}
              />
            </div>
          )}

          {layers.map((layer) => {
            const layerKey = getCommunityLayerKey(layer);

            return (
              <Checkbox
                key={layerKey}
                label={getCommunityLayerTitle(layer)}
                checked={selectedKeys.includes(layerKey)}
                onChange={() => onToggleLayer(layerKey)}
                disabled={isSubmitting}
              />
            );
          })}
        </div>

        <div className={styles.dialogActions}>
          <Button
            variant='outline'
            color='secondary'
            onClick={onClose}
            disabled={isSubmitting}
          >
            {t('offline.dialog.cancel')}
          </Button>
          <Button
            onClick={onValidate}
            loading={isSubmitting}
          >
            {t('offline.dialog.validate')}
          </Button>
        </div>
      </div>
    </Alert>
  );
}
