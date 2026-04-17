import { useTranslation } from 'react-i18next';

import type { OfflineCommunityCache, OfflineZone } from '@/domain/offline/models';

import { Button } from '@/shared/ui/Button';

import IconAdd from '@/shared/assets/icons/icon-add.svg?react';
import IconDelete from '@/shared/assets/icons/icon-delete.svg?react';

import typography from '@/shared/styles/typography.module.css';

import styles from '@/features/offline/pages/OfflineManagementPage.module.css';

interface OfflineZonesSectionProps {
  zones: OfflineZone[];
  activeCommunityCache: OfflineCommunityCache | null;
  hasLoadedCache: boolean;
  isDownloading: boolean;
  onOpenNewZoneDialog: () => void;
  onAddZoneToCache: (zoneName: string) => void;
  onRequestDeleteZone: (zoneName: string) => void;
}

export function OfflineZonesSection({
  zones,
  activeCommunityCache,
  hasLoadedCache,
  isDownloading,
  onOpenNewZoneDialog,
  onAddZoneToCache,
  onRequestDeleteZone,
}: OfflineZonesSectionProps) {
  const { t } = useTranslation();

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>{t('offline.zones.title')}</h2>
          <p className={`${typography.caption} ${styles.sectionDescription}`}>
            {t('offline.zones.description')}
          </p>
        </div>

        <Button onClick={onOpenNewZoneDialog} disabled={isDownloading}>
          {t('offline.zones.newZone')}
        </Button>
      </div>

      {zones.length === 0 ? (
        <p className={typography.caption}>{t('offline.zones.empty')}</p>
      ) : (
        <div className={styles.list}>
          {zones.map((zone) => {
            const isInCache =
              activeCommunityCache?.zoneNames.includes(zone.name) ?? false;

            return (
              <div key={zone.name} className={styles.listRow}>
                <div className={styles.listMain}>
                  <p className={styles.rowTitle}>{zone.name}</p>
                  <p className={typography.caption}>
                    {t('offline.zones.extentCount', {
                      count: zone.extents.length,
                    })}
                  </p>
                  {isInCache && (
                    <p className={styles.lockedNote}>
                      {t('offline.zones.inCache')}
                    </p>
                  )}
                </div>

                <div className={styles.rowActions}>
                  {hasLoadedCache && !isInCache && (
                    <Button
                      iconOnly
                      color='secondary'
                      variant='outline'
                      onClick={() => onAddZoneToCache(zone.name)}
                      disabled={isDownloading}
                      aria-label={t('offline.zones.addToCache')}
                      title={t('offline.zones.addToCache')}
                    >
                      <IconAdd className={styles.rowActionIcon} />
                    </Button>
                  )}
                  <Button
                    iconOnly
                    color='danger'
                    variant='outline'
                    onClick={() => onRequestDeleteZone(zone.name)}
                    disabled={isDownloading}
                    aria-label={t('offline.zones.delete')}
                    title={t('offline.zones.delete')}
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
