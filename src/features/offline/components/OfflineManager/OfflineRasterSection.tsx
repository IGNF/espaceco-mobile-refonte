import { useTranslation } from 'react-i18next';

import type { OfflineRasterMap, OfflineZone, RasterScaleOption } from '@/domain/offline/models';

import { Button } from '@/shared/ui/Button';

import IconAdd from '@/shared/assets/icons/icon-add.svg?react';
import IconDelete from '@/shared/assets/icons/icon-delete.svg?react';
import IconEye from '@/shared/assets/icons/icon-eye.svg?react';
import typography from '@/shared/styles/typography.module.css';

import { formatDateTime } from '@/shared/utils/date';

import { getGeoportailLayerTitle } from '@/infra/map/openlayers/geoportailLayers';

import styles from '@/features/offline/pages/OfflineManagementPage.module.css';

interface OfflineRasterSectionProps {
  rasterMaps: OfflineRasterMap[];
  zones: OfflineZone[];
  rasterScaleOptions: RasterScaleOption[];
  isDownloading: boolean;
  onOpenNewRasterMapDialog: () => void;
  onToggleRasterMapVisibility: (mapId: string, visible: boolean) => void;
  onOpenRasterZoneDialog: (mapId: string, mode: 'load' | 'append') => void;
  onRefreshRasterMap: (mapId: string) => void;
  onRequestDeleteRasterMap: (mapId: string) => void;
}

export function OfflineRasterSection({
  rasterMaps,
  zones,
  rasterScaleOptions,
  isDownloading,
  onOpenNewRasterMapDialog,
  onToggleRasterMapVisibility,
  onOpenRasterZoneDialog,
  onRefreshRasterMap,
  onRequestDeleteRasterMap,
}: OfflineRasterSectionProps) {
  const { t } = useTranslation();

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>{t('offline.raster.title')}</h2>
          <p className={`${typography.caption} ${styles.sectionDescription}`}>
            {t('offline.raster.description')}
          </p>
        </div>

        <Button onClick={onOpenNewRasterMapDialog} disabled={isDownloading}>
          {t('offline.raster.newMap')}
        </Button>
      </div>

      {rasterMaps.length === 0 ? (
        <p className={typography.caption}>{t('offline.raster.empty')}</p>
      ) : (
        <div className={styles.list}>
          {rasterMaps.map((rasterMap) => {
            const hasAddableZone = zones.some(
              (zone) => !rasterMap.zoneNames.includes(zone.name)
            );
            const refreshedAt = rasterMap.lastRefreshAt
              ? formatDateTime(new Date(rasterMap.lastRefreshAt))
              : null;
            const minScaleLabel =
              rasterScaleOptions.find((option) => option.value === rasterMap.minZoom)?.label ??
              String(rasterMap.minZoom);
            const maxScaleLabel =
              rasterScaleOptions.find((option) => option.value === rasterMap.maxZoom)?.label ??
              String(rasterMap.maxZoom);

            return (
              <div key={rasterMap.id} className={styles.listRow}>
                <div className={styles.listMain}>
                  <p className={styles.rowTitle}>{rasterMap.name}</p>
                  <p className={typography.caption}>
                    {getGeoportailLayerTitle(rasterMap.layerName)}
                  </p>
                  <p className={typography.caption}>
                    {rasterMap.minZoom === rasterMap.maxZoom
                      ? t('offline.raster.zoomSingle', {
                        value: maxScaleLabel,
                      })
                      : t('offline.raster.zoomRange', {
                        min: minScaleLabel,
                        max: maxScaleLabel,
                      })}
                  </p>
                  <p className={typography.caption}>
                    {rasterMap.loaded
                      ? t('offline.raster.zoneCount', {
                        count: rasterMap.zoneNames.length,
                      })
                      : t('offline.raster.pending')}
                  </p>
                  {refreshedAt && (
                    <p className={typography.caption}>
                      {t('offline.raster.updatedAt', { value: refreshedAt })}
                    </p>
                  )}
                </div>

                <div className={styles.rowActions}>
                  {rasterMap.loaded ? (
                    <>
                      <Button
                        iconOnly
                        color='secondary'
                        variant={rasterMap.visible ? 'solid' : 'outline'}
                        onClick={() => onToggleRasterMapVisibility(rasterMap.id, !rasterMap.visible)}
                        disabled={isDownloading}
                        aria-label={
                          rasterMap.visible
                            ? t('offline.raster.hide')
                            : t('offline.raster.show')
                        }
                        title={
                          rasterMap.visible
                            ? t('offline.raster.hide')
                            : t('offline.raster.show')
                        }
                      >
                        <IconEye className={styles.rowActionIcon} />
                      </Button>
                      <Button
                        iconOnly
                        color='secondary'
                        variant='outline'
                        onClick={() => onOpenRasterZoneDialog(rasterMap.id, 'append')}
                        disabled={isDownloading || !hasAddableZone}
                        aria-label={t('offline.raster.addZone')}
                        title={t('offline.raster.addZone')}
                      >
                        <IconAdd className={styles.rowActionIcon} />
                      </Button>
                      <Button
                        iconOnly
                        color='secondary'
                        variant='outline'
                        onClick={() => onRefreshRasterMap(rasterMap.id)}
                        disabled={isDownloading}
                        aria-label={t('offline.raster.refresh')}
                        title={t('offline.raster.refresh')}
                      >
                        <span className={styles.rowActionGlyph}>↻</span>
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant='outline'
                      color='secondary'
                      onClick={() => onOpenRasterZoneDialog(rasterMap.id, 'load')}
                      disabled={isDownloading || zones.length === 0}
                    >
                      {t('offline.raster.download')}
                    </Button>
                  )}
                  <Button
                    iconOnly
                    color='danger'
                    variant='outline'
                    onClick={() => onRequestDeleteRasterMap(rasterMap.id)}
                    disabled={isDownloading}
                    aria-label={t('offline.raster.delete')}
                    title={t('offline.raster.delete')}
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
