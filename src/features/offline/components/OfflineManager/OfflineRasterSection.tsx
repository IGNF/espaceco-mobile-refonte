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
  isPendingRasterPreviewLoading: boolean;
  rasterMapIdBeingPreviewed: string | null;
  rasterMapIdBeingRefreshed: string | null;
  onOpenNewRasterMapDialog: () => void;
  onDownloadPendingRasterMaps: () => void;
  onToggleRasterMapVisibility: (mapId: string, visible: boolean) => void;
  onOpenRasterZoneDialog: (mapId: string, mode: 'load-map' | 'add-zone') => void;
  onRefreshRasterMap: (mapId: string) => void;
  onRequestDeleteRasterMap: (mapId: string) => void;
}

export function OfflineRasterSection({
  rasterMaps,
  zones,
  rasterScaleOptions,
  isDownloading,
  isPendingRasterPreviewLoading,
  rasterMapIdBeingPreviewed,
  rasterMapIdBeingRefreshed,
  onOpenNewRasterMapDialog,
  onDownloadPendingRasterMaps,
  onToggleRasterMapVisibility,
  onOpenRasterZoneDialog,
  onRefreshRasterMap,
  onRequestDeleteRasterMap,
}: OfflineRasterSectionProps) {
  const { t } = useTranslation();
  const hasPendingRasterMaps = rasterMaps.some((rasterMap) => !rasterMap.loaded);
  const isRasterPreviewLoading = isPendingRasterPreviewLoading || rasterMapIdBeingPreviewed !== null;

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>{t('offline.raster.title')}</h2>
          <p className={`${typography.caption} ${styles.sectionDescription}`}>
            {t('offline.raster.description')}
          </p>
        </div>

        <div className={styles.sectionHeaderActions}>
          {hasPendingRasterMaps && (
            <Button
              className={styles.sectionHeaderButton}
              variant='outline'
              color='secondary'
              onClick={onDownloadPendingRasterMaps}
              disabled={isDownloading || isRasterPreviewLoading || zones.length === 0}
              loading={isPendingRasterPreviewLoading}
            >
              {t('offline.raster.loadPending')}
            </Button>
          )}
          <Button
            className={styles.sectionHeaderButton}
            onClick={onOpenNewRasterMapDialog}
            disabled={isDownloading || isRasterPreviewLoading}
          >
            {t('offline.raster.newMap')}
          </Button>
        </div>
      </div>

      {rasterMaps.length === 0 ? (
        <p className={typography.caption}>{t('offline.raster.empty')}</p>
      ) : (
        <div className={styles.list}>
          {rasterMaps.map((rasterMap) => {
            const hasAddableZone = zones.some(
              (zone) => !rasterMap.zoneNames.includes(zone.name)
            );
            const isPreviewLoading = rasterMapIdBeingPreviewed === rasterMap.id;
            const isRefreshingRasterMap = rasterMapIdBeingRefreshed === rasterMap.id;
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
              <div key={rasterMap.id} className={`${styles.listRow} ${styles.rasterListRow}`}>
                <div className={styles.listMain}>
                  <span className={styles.rowTitle}>{rasterMap.name}</span>
                  <span className={typography.caption}>
                    {getGeoportailLayerTitle(rasterMap.layerName)}
                  </span>
                  <span className={typography.caption}>
                    {rasterMap.minZoom === rasterMap.maxZoom
                      ? t('offline.raster.zoomSingle', {
                        value: maxScaleLabel,
                      })
                      : t('offline.raster.zoomRange', {
                        min: minScaleLabel,
                        max: maxScaleLabel,
                      })}
                  </span>
                  <span className={typography.caption}>
                    {rasterMap.loaded
                      ? t('offline.raster.zoneCount', {
                        count: rasterMap.zoneNames.length,
                      })
                      : t('offline.raster.pending')}
                  </span>
                  {refreshedAt && (
                    <span className={typography.caption}>
                      {t('offline.raster.updatedAt', { value: refreshedAt })}
                    </span>
                  )}
                </div>

                <div className={`${styles.rowActions} ${styles.rasterRowActions}`}>
                  {rasterMap.loaded ? (
                    <>
                      <Button
                        iconOnly
                        color='secondary'
                        variant={rasterMap.visible ? 'solid' : 'outline'}
                        onClick={() => onToggleRasterMapVisibility(rasterMap.id, !rasterMap.visible)}
                        disabled={isDownloading || isRasterPreviewLoading}
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
                        onClick={() => onOpenRasterZoneDialog(rasterMap.id, 'add-zone')}
                        disabled={isDownloading || isRasterPreviewLoading || !hasAddableZone}
                        loading={isPreviewLoading}
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
                        disabled={isDownloading || isRasterPreviewLoading}
                        loading={isRefreshingRasterMap}
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
                      onClick={() => onOpenRasterZoneDialog(rasterMap.id, 'load-map')}
                      disabled={isDownloading || isRasterPreviewLoading || zones.length === 0}
                      loading={isPreviewLoading}
                    >
                      {t('offline.raster.download')}
                    </Button>
                  )}
                  <Button
                    iconOnly
                    color='danger'
                    variant='outline'
                    onClick={() => onRequestDeleteRasterMap(rasterMap.id)}
                    disabled={isDownloading || isRasterPreviewLoading}
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
