import { useTranslation } from 'react-i18next';

import styles from '@/features/offline/pages/OfflineManagementPage.module.css';

import { Button } from '@/shared/ui/Button';

import typography from '@/shared/styles/typography.module.css';

interface OfflineCacheSectionProps {
  hasLoadedCache: boolean;
  currentLayerCount: number;
  zoneCount: number;
  loadedLayerCount: number;
  loadedZoneCount: number;
  canLoadInitialCache: boolean;
  canRefresh: boolean;
  canDeleteCache: boolean;
  isDownloading: boolean;
  onOpenLoadDialog: () => void;
  onRefreshCache: () => void;
  onRequestDeleteCache: () => void;
}

export function OfflineCacheSection({
  hasLoadedCache,
  currentLayerCount,
  zoneCount,
  loadedLayerCount,
  loadedZoneCount,
  canLoadInitialCache,
  canRefresh,
  canDeleteCache,
  isDownloading,
  onOpenLoadDialog,
  onRefreshCache,
  onRequestDeleteCache,
}: OfflineCacheSectionProps) {
  const { t } = useTranslation();

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{t('offline.cache.title')}</h2>

      {!hasLoadedCache ? (
        <p className={`${typography.caption} ${styles.sectionDescription}`}>
          {t('offline.cache.selection', {
            layers: currentLayerCount,
            zones: zoneCount,
          })}
        </p>
      ) : (
        <p className={`${typography.caption} ${styles.sectionDescription}`}>
          {t('offline.cache.loadedDetails', {
            layers: loadedLayerCount,
            zones: loadedZoneCount,
          })}
        </p>
      )}

      <div className={styles.cacheActions}>
        {!hasLoadedCache && (
          <Button
            fullWidth
            onClick={onOpenLoadDialog}
            disabled={!canLoadInitialCache}
            loading={isDownloading}
          >
            {t('offline.cache.download')}
          </Button>
        )}
        {hasLoadedCache && (
          <Button
            fullWidth
            color='secondary'
            variant='outline'
            onClick={onRefreshCache}
            disabled={!canRefresh}
          >
            {t('offline.cache.refresh')}
          </Button>
        )}
        <Button
          fullWidth
          color='danger'
          variant='ghost'
          onClick={onRequestDeleteCache}
          disabled={!canDeleteCache}
        >
          {t('offline.cache.delete')}
        </Button>
      </div>
    </section>
  );
}
