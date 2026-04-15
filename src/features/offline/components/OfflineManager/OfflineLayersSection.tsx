import { useTranslation } from 'react-i18next';
import type { CommunityLayer } from '@ign/mobile-core';
import { Button } from '@/shared/ui/Button';
import IconDelete from '@/shared/assets/icons/icon-delete.svg?react';
import typography from '@/shared/styles/typography.module.css';
import { getCommunityLayerKey } from '@/shared/utils/layerKey';
import { getCommunityLayerTitle } from '@/shared/utils/communityLayer';
import styles from '@/features/offline/pages/OfflineManagementPage.module.css';

interface OfflineLayersSectionProps {
  currentCacheLayers: CommunityLayer[];
  hasLoadedCache: boolean;
  selectedLayerKeys: string[];
  isOfflineAllowed: boolean;
  isDownloading: boolean;
  canOpenLayerPicker: boolean;
  onOpenLayerPicker: () => void;
  onRefreshLayer: (layerKey: string) => void;
  onRequestDeleteLayer: (layerKey: string) => void;
}

export function OfflineLayersSection({
  currentCacheLayers,
  hasLoadedCache,
  selectedLayerKeys,
  isOfflineAllowed,
  isDownloading,
  canOpenLayerPicker,
  onOpenLayerPicker,
  onRefreshLayer,
  onRequestDeleteLayer,
}: OfflineLayersSectionProps) {
  const { t } = useTranslation();

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>{t('offline.layers.title')}</h2>
          <p className={`${typography.caption} ${styles.sectionDescription}`}>
            {t('offline.layers.description')}
          </p>
        </div>

        <Button
          onClick={onOpenLayerPicker}
          disabled={!canOpenLayerPicker}
        >
          {t('offline.cache.addLayers')}
        </Button>
      </div>

      {currentCacheLayers.length === 0 ? (
        <p className={typography.caption}>{t('offline.layers.empty')}</p>
      ) : (
        <div className={styles.list}>
          {currentCacheLayers.map((layer) => {
            const layerKey = getCommunityLayerKey(layer);
            const isLoaded = hasLoadedCache && selectedLayerKeys.includes(layerKey);

            return (
              <div key={layerKey} className={styles.listRow}>
                <div className={styles.listMain}>
                  <p className={styles.rowTitle}>{getCommunityLayerTitle(layer)}</p>
                  <p className={typography.caption}>
                    {isLoaded
                      ? t('offline.layers.loaded')
                      : t('offline.layers.pending')}
                  </p>
                </div>

                <div className={styles.rowActions}>
                  {isLoaded && (
                    <Button
                      iconOnly
                      color='secondary'
                      variant='outline'
                      onClick={() => onRefreshLayer(layerKey)}
                      disabled={isDownloading || !isOfflineAllowed}
                      aria-label={t('offline.layers.refresh')}
                      title={t('offline.layers.refresh')}
                    >
                      <span className={styles.rowActionGlyph}>↻</span>
                    </Button>
                  )}
                  <Button
                    iconOnly
                    color='danger'
                    variant='outline'
                    onClick={() => onRequestDeleteLayer(layerKey)}
                    disabled={isDownloading}
                    aria-label={t('offline.layers.delete')}
                    title={t('offline.layers.delete')}
                  >
                    <IconDelete className={styles.rowActionIcon} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
