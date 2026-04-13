import { useState } from 'react';
import type { CommunityLayer } from '@ign/mobile-core';
import type Map from 'ol/Map';
import type { Extent } from 'ol/extent';
import { useTranslation } from 'react-i18next';
import { useCommunity } from '@/features/community/hooks/useCommunity';
import { useOffline } from '@/features/offline/hooks/useOffline';
import { getTableWfsUrl } from '@/infra/map/openlayers/vectorLayers';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import { Checkbox } from '@/shared/ui/Checkbox';
import { PageHeader } from '@/shared/ui/PageHeader';
import { SlideUpPage } from '@/shared/ui/SlideUpPage';
import { Toggle } from '@/shared/ui/Toggle';
import IconAdd from '@/shared/assets/icons/icon-add.svg?react';
import IconDelete from '@/shared/assets/icons/icon-delete.svg?react';
import { getUserFacingErrorMessage } from '@/shared/errors/appError';
import {
  getCommunityLayerGeometryType,
  getCommunityLayerTitle,
} from '@/shared/utils/communityLayer';
import { formatDateTime } from '@/shared/utils/date';
import { showToastSafe } from '@/shared/utils/toast';
import { getCommunityLayerKey } from '@/shared/utils/layerKey';
import screen from '@/shared/styles/screen.module.css';
import inputs from '@/shared/styles/inputs.module.css';
import typography from '@/shared/styles/typography.module.css';
import {
  OfflineZoneEditorOverlay,
  type OfflineZoneEditorMode,
} from './OfflineZoneEditorOverlay';
import styles from './OfflineManagementPage.module.css';

type LayerPickerMode = 'draft-cache' | 'loaded-cache';

interface ZoneEditorState {
  name: string;
  mode: OfflineZoneEditorMode;
  layerKey: string | null;
  restoreLayerVisibility: boolean;
}

interface OfflineManagementPageProps {
  isOpen: boolean;
  onClose: () => void;
  map: Map | null;
  vectorLayers: CommunityLayer[];
  onSetLayerVisibility?: (layerKey: string, visible: boolean) => void;
  onCenterOnUserLocation?: () => Promise<void>;
  isLocating?: boolean;
}

export function OfflineManagementPage({
  isOpen,
  onClose,
  map,
  vectorLayers,
  onSetLayerVisibility,
  onCenterOnUserLocation,
  isLocating = false,
}: OfflineManagementPageProps) {
  const { t } = useTranslation();
  const { activeCommunity } = useCommunity();
  const {
    mode,
    activeCommunityId,
    activeCommunityCache,
    isOfflineAllowed,
    hasOfflineData,
    zones,
    isDownloading,
    downloadProgress,
    downloadError,
    setOfflineMode,
    saveZone,
    deleteZone,
    saveCommunityCacheDraft,
    downloadCommunityCache,
    refreshCommunityCache,
    refreshCommunityCacheLayer,
    cancelOfflineDownload,
    deleteCommunityCacheLayer,
    deleteCommunityCache,
  } = useOffline();
  const [isNewZoneDialogOpen, setIsNewZoneDialogOpen] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneMode, setNewZoneMode] = useState<OfflineZoneEditorMode>('custom');
  const [newZoneLayerKey, setNewZoneLayerKey] = useState('');
  const [zoneEditorState, setZoneEditorState] = useState<ZoneEditorState | null>(null);
  const [layerPickerMode, setLayerPickerMode] = useState<LayerPickerMode | null>(null);
  const [layerPickerKeys, setLayerPickerKeys] = useState<string[]>([]);
  const [isLoadZoneDialogOpen, setIsLoadZoneDialogOpen] = useState(false);

  const eligibleLayers = vectorLayers.filter((layer) => getTableWfsUrl(layer) !== undefined);
  const polygonLayers = eligibleLayers.filter(
    (layer) => getCommunityLayerGeometryType(layer) === 'Polygon'
  );
  const hasPolygonLayer = polygonLayers.length > 0;
  const hasActiveCommunity = activeCommunityId !== null;
  const hasLoadedCache = activeCommunityCache?.loaded === true;
  const hasCurrentCache = activeCommunityCache !== null;
  const selectedLayerKeys = activeCommunityCache?.layerKeys ?? [];
  const currentCacheLayers = activeCommunityCache
    ? activeCommunityCache.layers.map((cacheLayer) => cacheLayer.layer)
    : [];
  const hasCurrentCacheLayers = currentCacheLayers.length > 0;
  const addableLayers = eligibleLayers.filter(
    (layer) => !selectedLayerKeys.includes(getCommunityLayerKey(layer))
  );
  const hasZones = zones.length > 0;
  const hasEligibleLayers = eligibleLayers.length > 0;
  const hasAddableLayers = addableLayers.length > 0;
  const isIdle = !isDownloading;
  const canLoadInitialCache =
    hasActiveCommunity &&
    isOfflineAllowed &&
    !hasLoadedCache &&
    hasCurrentCacheLayers &&
    hasZones &&
    isIdle;
  const canRefresh = hasActiveCommunity && hasLoadedCache && isOfflineAllowed && isIdle;
  const canDeleteCache = hasActiveCommunity && hasCurrentCache && isIdle;
  const canOpenLayerPicker =
    isOfflineAllowed &&
    isIdle &&
    (hasLoadedCache ? hasAddableLayers : hasEligibleLayers);
  const canToggleOfflineMode = hasOfflineData && isOfflineAllowed && isIdle;
  const layerPickerLayers = layerPickerMode === 'loaded-cache' ? addableLayers : eligibleLayers;
  const areAllLayerPickerLayersSelected =
    layerPickerLayers.length > 0 && layerPickerKeys.length === layerPickerLayers.length;
  const currentZoneEditorLayer = zoneEditorState?.layerKey
    ? eligibleLayers.find((layer) => getCommunityLayerKey(layer) === zoneEditorState.layerKey) ?? null
    : null;

  async function showOfflineError(error: unknown): Promise<void> {
    await showToastSafe({
      text: getUserFacingErrorMessage(error, t, 'errors.global.unknown'),
      duration: 'short',
      position: 'bottom',
    });
  }

  function closeZoneEditor() {
    if (zoneEditorState?.layerKey && zoneEditorState.restoreLayerVisibility) {
      onSetLayerVisibility?.(zoneEditorState.layerKey, false);
    }
    setZoneEditorState(null);
  }

  function openNewZoneDialog() {
    setNewZoneName(`Zone${zones.length + 1}`);
    setNewZoneMode('custom');
    setNewZoneLayerKey(hasPolygonLayer ? getCommunityLayerKey(polygonLayers[0]) : '');
    setIsNewZoneDialogOpen(true);
  }

  /**
   * Opens the full-screen zone editor after the dialog step.
   * In object-selection mode, the chosen layer is made visible temporarily if needed.
   */
  function startZoneEditor() {
    const layerKey = newZoneMode === 'select-obj' ? newZoneLayerKey : null;
    let restoreLayerVisibility = false;
    const selectedLayer = layerKey
      ? eligibleLayers.find((layer) => getCommunityLayerKey(layer) === layerKey) ?? null
      : null;

    if (selectedLayer && selectedLayer.visible === false) {
      onSetLayerVisibility?.(layerKey as string, true);
      restoreLayerVisibility = true;
    }

    setIsNewZoneDialogOpen(false);
    setZoneEditorState({
      name: newZoneName.trim(),
      mode: newZoneMode,
      layerKey,
      restoreLayerVisibility,
    });
  }

  async function handleSaveZone(extents: Extent[]) {
    try {
      await saveZone(zoneEditorState!.name, extents);
      closeZoneEditor();
      await showToastSafe({
        text: t('offline.toasts.zoneCreated'),
        duration: 'short',
        position: 'bottom',
      });
    } catch (error) {
      await showOfflineError(error);
    }
  }

  async function handleDeleteZone(zoneName: string) {
    try {
      await deleteZone(zoneName);
      await showToastSafe({
        text: t('offline.toasts.zoneDeleted'),
        duration: 'short',
        position: 'bottom',
      });
    } catch (error) {
      await showOfflineError(error);
    }
  }

  function openLayerPicker() {
    if (hasLoadedCache) {
      setLayerPickerMode('loaded-cache');
      setLayerPickerKeys(addableLayers.map((layer) => getCommunityLayerKey(layer)));
    }
    else {
      setLayerPickerMode('draft-cache');
      setLayerPickerKeys(
        currentCacheLayers.length > 0
          ? currentCacheLayers.map((layer) => getCommunityLayerKey(layer))
          : eligibleLayers.map((layer) => getCommunityLayerKey(layer))
      );
    }
  }

  function closeLayerPicker() {
    setLayerPickerMode(null);
    setLayerPickerKeys([]);
  }

  function toggleLayerPickerKey(layerKey: string) {
    setLayerPickerKeys((current) =>
      current.includes(layerKey)
        ? current.filter((key) => key !== layerKey)
        : [...current, layerKey]
    );
  }

  function handleToggleAllLayerPickerLayers(checked: boolean) {
    setLayerPickerKeys(
      checked ? layerPickerLayers.map((layer) => getCommunityLayerKey(layer)) : []
    );
  }

  /**
   * Validates the layer picker according to the current cache state.
   * Before first load it only updates the draft cache; after load it starts downloading new layers.
   */
  async function handleValidateLayerPicker() {
    if (layerPickerMode && layerPickerMode === 'draft-cache') {
      const selectedLayers = eligibleLayers.filter((layer) =>
        layerPickerKeys.includes(getCommunityLayerKey(layer))
      );

      try {
        await saveCommunityCacheDraft({
          communityId: activeCommunityId!,
          layers: selectedLayers,
        });
        closeLayerPicker();
      } catch (error) {
        await showOfflineError(error);
      }

      return;
    }

    const selectedLayers = addableLayers.filter((layer) =>
      layerPickerKeys.includes(getCommunityLayerKey(layer))
    );

    if (selectedLayers.length === 0) {
      closeLayerPicker();
      return;
    }

    try {
      closeLayerPicker();
      await downloadCommunityCache({
        communityId: activeCommunityId!,
        layers: selectedLayers,
        zoneNames: [],
      });
      await showToastSafe({
        text: t('offline.cache.layersAddedSuccess'),
        duration: 'short',
        position: 'bottom',
      });
    } catch (error) {
      await showOfflineError(error);
    }
  }

  /**
   * Performs the first cache load for one chosen zone.
   */
  async function loadCacheForZone(zoneName: string) {
    try {
      await downloadCommunityCache({
        communityId: activeCommunityId!,
        layers: currentCacheLayers,
        zoneNames: [zoneName],
      });
      setIsLoadZoneDialogOpen(false);
      await showToastSafe({
        text: t('offline.cache.downloadSuccess'),
        duration: 'short',
        position: 'bottom',
      });
    } catch (error) {
      await showOfflineError(error);
    }
  }

  // Open zone selection dialog if there are multiple zones, otherwise load the first zone.
  function handleOpenLoadDialog() {
    if (zones.length === 1) {
      void loadCacheForZone(zones[0].name);
    }
    else {
      setIsLoadZoneDialogOpen(true);
    }
  }

  /**
   * Adds one more zone to an already loaded cache without changing its existing layers.
   */
  async function handleAddZoneToCache(zoneName: string) {
    try {
      await downloadCommunityCache({
        communityId: activeCommunityId!,
        layers: [],
        zoneNames: [zoneName],
      });
      await showToastSafe({
        text: t('offline.cache.zoneAddedSuccess'),
        duration: 'short',
        position: 'bottom',
      });
    } catch (error) {
      await showOfflineError(error);
    }
  }

  async function handleRefreshCache() {
    try {
      await refreshCommunityCache(activeCommunityId!);
      await showToastSafe({
        text: t('offline.cache.refreshSuccess'),
        duration: 'short',
        position: 'bottom',
      });
    } catch (error) {
      await showOfflineError(error);
    }
  }

  async function handleDeleteCache() {
    try {
      await deleteCommunityCache(activeCommunityId!);
      await showToastSafe({
        text: t('offline.cache.deleteSuccess'),
        duration: 'short',
        position: 'bottom',
      });
    } catch (error) {
      await showOfflineError(error);
    }
  }

  const refreshedAt = activeCommunityCache?.lastRefreshAt ? formatDateTime(new Date(activeCommunityCache.lastRefreshAt)) : null;
  const inlineError = downloadError ? getUserFacingErrorMessage(downloadError, t, 'errors.global.unknown') : null;

  /**
   * Removes one layer from the current cache definition and its downloaded data.
   */
  async function handleDeleteLayer(layerKey: string) {
    try {
      await deleteCommunityCacheLayer(activeCommunityId!, layerKey);
      await showToastSafe({
        text: t('offline.layers.deleteSuccess'),
        duration: 'short',
        position: 'bottom',
      });
    } catch (error) {
      await showOfflineError(error);
    }
  }

  async function handleRefreshLayer(layerKey: string) {
    try {
      await refreshCommunityCacheLayer(activeCommunityId!, layerKey);
      await showToastSafe({
        text: t('offline.layers.refreshSuccess'),
        duration: 'short',
        position: 'bottom',
      });
    } catch (error) {
      await showOfflineError(error);
    }
  }

  async function handleToggleOfflineMode(checked: boolean) {
    try {
      await setOfflineMode(checked ? 'offline' : 'online');
      await showToastSafe({
        text: checked
          ? t('offline.mode.offlineEnabled')
          : t('offline.mode.onlineEnabled'),
        duration: 'short',
        position: 'bottom',
      });
    } catch (error) {
      await showOfflineError(error);
    }
  }

  if (zoneEditorState && isOpen) {
    return (
      <OfflineZoneEditorOverlay
        isOpen={isOpen}
        map={map}
        mode={zoneEditorState.mode}
        zoneName={zoneEditorState.name}
        layer={currentZoneEditorLayer}
        onCenterOnUserLocation={onCenterOnUserLocation}
        isLocating={isLocating}
        onCancel={closeZoneEditor}
        onSave={handleSaveZone}
      />
    );
  }

  return (
    <>
      <SlideUpPage isOpen={isOpen} onClose={onClose}>
        <PageHeader
          title={t('offline.title')}
          subtitle={activeCommunity?.name ?? t('offline.subtitle')}
          onBack={onClose}
          onClose={onClose}
        />

        <main className={`${screen.screenContainer} ${styles.content}`}>
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
                    onChange={(checked) => void handleToggleOfflineMode(checked)}
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
                      count: activeCommunityCache.layers.length,
                    })}
                  </span>
                  <span className={typography.caption + ' ' + styles.summaryValue}>
                    {t('offline.status.zones', {
                      count: activeCommunityCache.zoneNames.length,
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
                    onClick={cancelOfflineDownload}
                  >
                    {t('offline.status.cancel')}
                  </Button>
                </div>
              </div>
            )}

            {inlineError && <p className={`${inputs.error} ${styles.error}`}>{inlineError}</p>}
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>{t('offline.zones.title')}</h2>
                <p className={`${typography.caption} ${styles.sectionDescription}`}>
                  {t('offline.zones.description')}
                </p>
              </div>

              <Button onClick={openNewZoneDialog} disabled={isDownloading}>
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
                          <button
                            type='button'
                            className={`${styles.rowIconButton} ${styles.rowIconButtonSecondary}`}
                            onClick={() => void handleAddZoneToCache(zone.name)}
                            disabled={isDownloading}
                            aria-label={t('offline.zones.addToCache')}
                            title={t('offline.zones.addToCache')}
                          >
                            <IconAdd className={styles.rowActionIcon} />
                          </button>
                        )}
                        <button
                          type='button'
                          className={`${styles.rowIconButton} ${styles.rowIconButtonDanger}`}
                          onClick={() => void handleDeleteZone(zone.name)}
                          disabled={isDownloading}
                          aria-label={t('offline.zones.delete')}
                          title={t('offline.zones.delete')}
                        >
                          <IconDelete className={styles.rowActionIcon} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>{t('offline.layers.title')}</h2>
                <p className={`${typography.caption} ${styles.sectionDescription}`}>
                  {t('offline.layers.description')}
                </p>
              </div>

              <Button
                onClick={openLayerPicker}
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
                          <button
                            type='button'
                            className={`${styles.rowIconButton} ${styles.rowIconButtonSecondary}`}
                            onClick={() => void handleRefreshLayer(layerKey)}
                            disabled={isDownloading || !isOfflineAllowed}
                            aria-label={t('offline.layers.refresh')}
                            title={t('offline.layers.refresh')}
                          >
                            <span className={styles.rowActionGlyph}>↻</span>
                          </button>
                        )}
                        <button
                          type='button'
                          className={`${styles.rowIconButton} ${styles.rowIconButtonDanger}`}
                          onClick={() => void handleDeleteLayer(layerKey)}
                          disabled={isDownloading}
                          aria-label={t('offline.layers.delete')}
                          title={t('offline.layers.delete')}
                        >
                          <IconDelete className={styles.rowActionIcon} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('offline.cache.title')}</h2>

            {!hasLoadedCache ? (
              <p className={`${typography.caption} ${styles.sectionDescription}`}>
                {t('offline.cache.selection', {
                  layers: currentCacheLayers.length,
                  zones: zones.length,
                })}
              </p>
            ) : (
              <p className={`${typography.caption} ${styles.sectionDescription}`}>
                {t('offline.cache.loadedDetails', {
                  layers: activeCommunityCache.layers.length,
                  zones: activeCommunityCache.zoneNames.length,
                })}
              </p>
            )}

            <div className={styles.cacheActions}>
              {!hasLoadedCache && (
                <Button
                  fullWidth
                  onClick={handleOpenLoadDialog}
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
                  onClick={handleRefreshCache}
                  disabled={!canRefresh}
                >
                  {t('offline.cache.refresh')}
                </Button>
              )}
              <Button
                fullWidth
                color='danger'
                variant='ghost'
                onClick={handleDeleteCache}
                disabled={!canDeleteCache}
              >
                {t('offline.cache.delete')}
              </Button>
            </div>
          </section>
        </main>
      </SlideUpPage>

      <Alert
        isOpen={isNewZoneDialogOpen}
        onClose={() => setIsNewZoneDialogOpen(false)}
        title={t('offline.zones.newZoneDialogTitle')}
      >
        <div className={styles.dialogContent}>
          <label className={inputs.field}>
            <span className={inputs.label}>{t('offline.zones.nameLabel')}</span>
            <input
              type='text'
              className={inputs.input}
              value={newZoneName}
              onChange={(event) => setNewZoneName(event.target.value)}
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
                onChange={() => setNewZoneMode('custom')}
              />
              <span>{t('offline.zones.customMode')}</span>
            </label>

            <label className={styles.radioOption}>
              <input
                type='radio'
                checked={newZoneMode === 'select-obj'}
                onChange={() => setNewZoneMode('select-obj')}
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
                    onChange={(event) => setNewZoneLayerKey(event.target.value)}
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
              onClick={() => setIsNewZoneDialogOpen(false)}
            >
              {t('offline.dialog.cancel')}
            </Button>
            <Button
              onClick={startZoneEditor}
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
        onClose={closeLayerPicker}
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
                  onChange={handleToggleAllLayerPickerLayers}
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
                  onChange={() => toggleLayerPickerKey(layerKey)}
                />
              );
            })}
          </div>

          <div className={styles.dialogActions}>
            <Button
              variant='outline'
              color='secondary'
              onClick={closeLayerPicker}
            >
              {t('offline.dialog.cancel')}
            </Button>
            <Button onClick={() => void handleValidateLayerPicker()}>
              {t('offline.dialog.validate')}
            </Button>
          </div>
        </div>
      </Alert>

      <Alert
        isOpen={isLoadZoneDialogOpen}
        onClose={() => setIsLoadZoneDialogOpen(false)}
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
                onClick={() => void loadCacheForZone(zone.name)}
              >
                {zone.name}
              </Button>
            ))}
          </div>
        </div>
      </Alert>
    </>
  );
}
