import { useTranslation } from 'react-i18next';
import type {
  OfflineCommunityCache,
  OfflineDownloadProgress,
  OfflineMode,
} from '@/domain/offline/models';
import { Button } from '@/shared/ui/Button';
import typography from '@/shared/styles/typography.module.css';
import inputs from '@/shared/styles/inputs.module.css';
import { Toggle } from '@/shared/ui/Toggle';
import styles from '@/features/offline/pages/OfflineManagementPage.module.css';

interface OfflineStatusSectionProps {
  mode: OfflineMode;
  hasOfflineData: boolean;
  isOfflineAllowed: boolean;
  canToggleOfflineMode: boolean;
  hasLoadedCache: boolean;
  activeCommunityCache: OfflineCommunityCache | null;
  refreshedAt: string | null;
  isDownloading: boolean;
  downloadProgress: OfflineDownloadProgress | null;
  inlineError: string | null;
  onToggleOfflineMode: (checked: boolean) => void;
  onCancelDownload: () => void;
}

export function OfflineStatusSection({
  mode,
  hasOfflineData,
  isOfflineAllowed,
  canToggleOfflineMode,
  hasLoadedCache,
  activeCommunityCache,
  refreshedAt,
  isDownloading,
  downloadProgress,
  inlineError,
  onToggleOfflineMode,
  onCancelDownload,
}: OfflineStatusSectionProps) {
  const { t } = useTranslation();

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{t('offline.status.title')}</h2>

      <div className={styles.statusCard}>
        {hasOfflineData && isOfflineAllowed && (
          <div className={styles.modeCard}>
            <div className={styles.modeInfo}>
              <p className={styles.summaryTitle}>
                {mode === 'offline'
                  ? t('offline.mode.offline')
                  : t('offline.mode.online')}
              </p>
            </div>

            <Toggle
              checked={mode === 'offline'}
              onChange={onToggleOfflineMode}
              color='primary'
              disabled={!canToggleOfflineMode}
            />
          </div>
        )}

        {hasLoadedCache ? (
          <div className={styles.cacheSummary}>
            <p className={styles.summaryTitle}>{t('offline.status.loaded')}</p>
            <span className={typography.caption + ' ' + styles.summaryValue}>
              {t('offline.status.layers', {
                count: activeCommunityCache!.layers.length,
              })}
            </span>
            <span className={typography.caption + ' ' + styles.summaryValue}>
              {t('offline.status.zones', {
                count: activeCommunityCache!.zoneNames.length,
              })}
            </span>
            {refreshedAt && (
              <span className={typography.caption + ' ' + styles.summaryValue}>
                {t('offline.status.updatedAt', { value: refreshedAt })}
              </span>
            )}
          </div>
        ) : activeCommunityCache ? (
          <div className={styles.cacheSummary}>
            <p className={styles.summaryTitle}>{t('offline.status.pending')}</p>
            <p className={typography.caption}>
              {t('offline.status.pendingLayers', {
                count: activeCommunityCache.layers.length,
              })}
            </p>
          </div>
        ) : (
          <p className={typography.caption}>{t('offline.status.empty')}</p>
        )}
      </div>

      {isDownloading && downloadProgress && (
        <div className={styles.progressSection}>
          <p className={styles.summaryTitle}>{t('offline.status.loading')}</p>
          <div className={styles.progressBar} aria-hidden='true'>
            <div
              className={styles.progressFill}
              style={{ width: `${downloadProgress.percent}%` }}
            />
          </div>
          <p className={typography.caption}>
            {t('offline.status.progress', {
              current: downloadProgress.downloadedTileCount,
              total: downloadProgress.totalTileCount,
              percent: downloadProgress.percent,
            })}
          </p>
          <p className={typography.caption}>
            {t('offline.status.currentLayer', {
              title: downloadProgress.currentLayerTitle,
            })}
          </p>
          <div className={styles.progressActions}>
            <Button
              variant='ghost'
              color='danger'
              onClick={onCancelDownload}
            >
              {t('offline.status.cancel')}
            </Button>
          </div>
        </div>
      )}

      {inlineError && <p className={`${inputs.error} ${styles.error}`}>{inlineError}</p>}
    </section>
  );
}
