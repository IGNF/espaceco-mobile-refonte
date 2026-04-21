import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type Map from 'ol/Map';
import type { Extent } from 'ol/extent';
import { useCommunity } from '@/features/community/hooks/useCommunity';

import type { CommunityLayer } from '@ign/mobile-core';

import { useOffline } from '@/features/offline/hooks/useOffline';
import { OfflineStatusSection } from '@/features/offline/components/OfflineManager/OfflineStatusSection';
import { OfflineZonesSection } from '@/features/offline/components/OfflineManager/OfflineZonesSection';
import { OfflineLayersSection } from '@/features/offline/components/OfflineManager/OfflineLayersSection';
import { OfflineCacheSection } from '@/features/offline/components/OfflineManager/OfflineCacheSection';
import { OfflineRasterSection } from '@/features/offline/components/OfflineManager/OfflineRasterSection';
import { OfflineDialogs } from '@/features/offline/components/OfflineManager/OfflineDialogs';

import { getOfflineGeoportailLayerOptions } from '@/infra/map/openlayers/geoportailLayers';
import { getTableWfsUrl } from '@/infra/map/openlayers/vectorLayers';

import { PageHeader } from '@/shared/ui/PageHeader';
import { SlideUpPage } from '@/shared/ui/SlideUpPage';

import { getUserFacingErrorMessage } from '@/shared/errors/appError';

import { getCommunityLayerGeometryType, getCommunityLayerTitle } from '@/shared/utils/communityLayer';
import { formatDateTime } from '@/shared/utils/date';
import { scrollToTop } from '@/shared/utils/scroll';
import { showToastSafe } from '@/shared/utils/toast';
import { getCommunityLayerKey } from '@/shared/utils/layerKey';

import { EXPERT_MODE } from '@/shared/constants/global';

import { DEFAULT_GEOPORTAIL_LAYERS } from '@/shared/constants/map';

import screen from '@/shared/styles/screen.module.css';

import type {
  OfflineRasterDownloadPreview,
  OfflineRasterMap,
  OfflineZoneEditorMode,
} from '@/domain/offline/models';
import { OfflineZoneEditorOverlay } from './OfflineZoneEditorOverlay';

import styles from './OfflineManagementPage.module.css';

type LayerPickerMode = 'draft-cache' | 'loaded-cache';
type DeleteAlertState =
  | { kind: 'zone'; zoneName: string }
  | { kind: 'layer'; layerKey: string }
  | { kind: 'raster-map'; mapId: string }
  | { kind: 'cache' };

interface ZoneEditorState {
  name: string;
  mode: OfflineZoneEditorMode;
  layerKey: string | null;
  restoreLayerVisibility: boolean;
}

interface RasterZoneDialogState {
  mapId: string;
  mode: 'load' | 'append';
}

interface RasterDownloadPreviewState {
  rasterMap: OfflineRasterMap;
  mapName: string;
  zoneName: string;
  mode: 'load' | 'append';
  preview: OfflineRasterDownloadPreview;
}

interface OfflineManagementPageProps {
  isOpen: boolean;
  onClose: () => void;
  map: Map | null;
  vectorLayers: CommunityLayer[];
  pendingChangesCountByLayerKey: Record<string, number>;
  onSetLayerVisibility?: (layerKey: string, visible: boolean) => void;
  onCenterOnUserLocation?: () => Promise<void>;
  isLocating?: boolean;
}

export function OfflineManagementPage({
  isOpen,
  onClose,
  map,
  vectorLayers,
  pendingChangesCountByLayerKey,
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
    rasterMaps,
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
    saveOfflineRasterMapDraft,
    previewOfflineRasterMapDownload,
    downloadOfflineRasterMap,
    refreshOfflineRasterMap,
    setOfflineRasterMapVisibility,
    cancelOfflineDownload,
    deleteCommunityCacheLayer,
    deleteCommunityCache,
    deleteOfflineRasterMap,
  } = useOffline();
  const [isNewZoneDialogOpen, setIsNewZoneDialogOpen] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneMode, setNewZoneMode] = useState<OfflineZoneEditorMode>('custom');
  const [newZoneLayerKey, setNewZoneLayerKey] = useState('');
  const [zoneEditorState, setZoneEditorState] = useState<ZoneEditorState | null>(null);
  const [layerPickerMode, setLayerPickerMode] = useState<LayerPickerMode | null>(null);
  const [layerPickerKeys, setLayerPickerKeys] = useState<string[]>([]);
  const [isLoadZoneDialogOpen, setIsLoadZoneDialogOpen] = useState(false);
  const [isNewRasterMapDialogOpen, setIsNewRasterMapDialogOpen] = useState(false);
  const [newRasterMapName, setNewRasterMapName] = useState('');
  const [newRasterMapLayerName, setNewRasterMapLayerName] = useState<string>(DEFAULT_GEOPORTAIL_LAYERS[0]);
  const [newRasterMapMinZoom, setNewRasterMapMinZoom] = useState(15);
  const [newRasterMapMaxZoom, setNewRasterMapMaxZoom] = useState(15);
  const [rasterZoneDialog, setRasterZoneDialog] = useState<RasterZoneDialogState | null>(null);
  const [rasterDownloadPreview, setRasterDownloadPreview] = useState<RasterDownloadPreviewState | null>(null);
  const [isRasterPreviewLoading, setIsRasterPreviewLoading] = useState(false);
  const [deleteAlert, setDeleteAlert] = useState<DeleteAlertState | null>(null);

  useEffect(() => {
    if (isDownloading) {
      scrollToTop();
    }
  }, [isDownloading]);

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
  const hasPendingChanges = Object.values(pendingChangesCountByLayerKey).some(
    (count) => count > 0
  );
  const geoportailLayerOptions = getOfflineGeoportailLayerOptions();
  const rasterScaleOptions = [
    { value: 18, label: t('offline.raster.scaleStreet') },
    { value: 17, label: t('offline.raster.scaleDistrict') },
    { value: 15, label: t('offline.raster.scaleCity') },
    { value: 13, label: t('offline.raster.scaleAround') },
    { value: 12, label: t('offline.raster.scaleDepartment') },
    { value: 10, label: t('offline.raster.scaleRegion') },
    { value: 7, label: t('offline.raster.scaleCountry') },
  ];
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
  const layerToDelete = deleteAlert?.kind === 'layer'
    ? currentCacheLayers.find((layer) => getCommunityLayerKey(layer) === deleteAlert.layerKey) ?? null
    : null;
  const rasterMapToDelete = deleteAlert?.kind === 'raster-map'
    ? rasterMaps.find((rasterMap) => rasterMap.id === deleteAlert.mapId) ?? null
    : null;
  const rasterMapForZoneDialog = rasterZoneDialog
    ? rasterMaps.find((rasterMap) => rasterMap.id === rasterZoneDialog.mapId) ?? null
    : null;
  const rasterZoneDialogZones = zones.filter((zone) =>
    rasterZoneDialog?.mode === 'append' && rasterMapForZoneDialog
      ? !rasterMapForZoneDialog.zoneNames.includes(zone.name)
      : true
  );

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

  async function confirmDeleteZone(zoneName: string) {
    setDeleteAlert(null);
    await handleDeleteZone(zoneName);
  }

  function openNewRasterMapDialog() {
    setNewRasterMapName(`Carte #${rasterMaps.length + 1}`);
    setNewRasterMapLayerName(DEFAULT_GEOPORTAIL_LAYERS[0]);
    setNewRasterMapMinZoom(15);
    setNewRasterMapMaxZoom(15);
    setIsNewRasterMapDialogOpen(true);
  }

  async function handleValidateNewRasterMap() {
    try {
      const savedRasterMap = await saveOfflineRasterMapDraft({
        name: newRasterMapName.trim(),
        layerName: newRasterMapLayerName,
        minZoom: EXPERT_MODE
          ? Math.min(newRasterMapMinZoom, newRasterMapMaxZoom)
          : newRasterMapMaxZoom,
        maxZoom: EXPERT_MODE
          ? Math.max(newRasterMapMinZoom, newRasterMapMaxZoom)
          : newRasterMapMaxZoom,
      });

      setIsNewRasterMapDialogOpen(false);

      if (zones.length === 0) {
        await showToastSafe({
          text: t('offline.raster.mapCreated'),
          duration: 'short',
          position: 'bottom',
        });
        return;
      }

      if (zones.length === 1) {
        await handleOpenRasterDownloadPreview(
          savedRasterMap,
          'load',
          zones[0].name
        );
        return;
      }

      setRasterZoneDialog({
        mapId: savedRasterMap.id,
        mode: 'load',
      });
    } catch (error) {
      await showOfflineError(error);
    }
  }

  async function handleDownloadRasterMap(mapId: string, zoneName: string) {
    try {
      setRasterZoneDialog(null);
      setRasterDownloadPreview(null);
      const offlineRasterMap = await downloadOfflineRasterMap(mapId, zoneName);
      await showToastSafe({
        text: offlineRasterMap.loadedAt
          ? t('offline.raster.downloadSuccess')
          : t('offline.raster.mapCreated'),
        duration: 'short',
        position: 'bottom',
      });
    } catch (error) {
      await showOfflineError(error);
    }
  }

  /**
   * Resolves the raster download preview first, then opens the confirmation alert.
   */
  async function handleOpenRasterDownloadPreview(
    rasterMap: OfflineRasterMap,
    mode: 'load' | 'append',
    zoneName: string
  ) {
    try {
      setIsRasterPreviewLoading(true);

      const preview = await previewOfflineRasterMapDownload(rasterMap, zoneName);

      setRasterZoneDialog(null);
      setRasterDownloadPreview({
        rasterMap,
        mapName: rasterMap.name,
        zoneName,
        mode,
        preview,
      });
    } catch (error) {
      await showOfflineError(error);
    } finally {
      setIsRasterPreviewLoading(false);
    }
  }

  /**
   * Starts the raster download from the preview already confirmed by the user.
   */
  async function handleConfirmRasterDownloadPreview() {
    await handleDownloadRasterMap(
      rasterDownloadPreview!.rasterMap.id,
      rasterDownloadPreview!.zoneName
    );
  }

  /**
   * Closes the preview and returns to the zone choice step for the same raster map.
   */
  function closeRasterDownloadPreview() {
    setRasterDownloadPreview(null);
  }

  function openRasterZoneDialog(mapId: string, mode: 'load' | 'append') {
    const rasterMap = rasterMaps.find((currentRasterMap) => currentRasterMap.id === mapId)!;

    if (zones.length === 1) {
      void handleOpenRasterDownloadPreview(
        rasterMap,
        mode,
        zones[0].name
      );
      return;
    }

    setRasterZoneDialog({
      mapId,
      mode,
    });
  }

  async function handleRefreshRasterMap(mapId: string) {
    try {
      await refreshOfflineRasterMap(mapId);
      await showToastSafe({
        text: t('offline.raster.refreshSuccess'),
        duration: 'short',
        position: 'bottom',
      });
    } catch (error) {
      await showOfflineError(error);
    }
  }

  async function handleToggleRasterMapVisibility(mapId: string, visible: boolean) {
    try {
      await setOfflineRasterMapVisibility(mapId, visible);
    } catch (error) {
      await showOfflineError(error);
    }
  }

  async function handleDeleteRasterMap(mapId: string) {
    try {
      await deleteOfflineRasterMap(mapId);
      await showToastSafe({
        text: t('offline.raster.deleteSuccess'),
        duration: 'short',
        position: 'bottom',
      });
    } catch (error) {
      await showOfflineError(error);
    }
  }

  function getDeleteAlertTitle(): string {
    if (deleteAlert?.kind === 'zone') {
      return t('offline.zones.confirmDeleteTitle');
    }

    if (deleteAlert?.kind === 'layer') {
      return t('offline.layers.confirmDeleteTitle');
    }

    if (deleteAlert?.kind === 'raster-map') {
      return t('offline.raster.confirmDeleteTitle');
    }

    // Whole cache
    return t('offline.cache.confirmDeleteTitle');
  }

  function getDeleteAlertSubtitle(): string {
    if (deleteAlert?.kind === 'zone') {
      return t('offline.zones.confirmDeleteMessage', { name: deleteAlert.zoneName });
    }

    if (deleteAlert?.kind === 'layer') {
      if (currentCacheLayers.length === 1) {
        return t('offline.layers.confirmDeleteLastLayerMessage', {
          title: getCommunityLayerTitle(layerToDelete!),
        });
      }

      return t('offline.layers.confirmDeleteMessage', {
        title: getCommunityLayerTitle(layerToDelete!),
      });
    }

    if (deleteAlert?.kind === 'raster-map') {
      return t('offline.raster.confirmDeleteMessage', {
        name: rasterMapToDelete?.name,
      });
    }

    // Whole cache
    return t('offline.cache.confirmDeleteMessage');
  }

  async function confirmDeleteAlert() {
    if (deleteAlert?.kind === 'zone') {
      await confirmDeleteZone(deleteAlert.zoneName);
    }
    else if (deleteAlert?.kind === 'layer') {
      await confirmDeleteLayer(deleteAlert.layerKey);
    }
    else if (deleteAlert?.kind === 'raster-map') {
      setDeleteAlert(null);
      await handleDeleteRasterMap(deleteAlert.mapId);
    }
    else { // Whole cache
      await confirmDeleteCache();
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
      setIsLoadZoneDialogOpen(false);
      await downloadCommunityCache({
        communityId: activeCommunityId!,
        layers: currentCacheLayers,
        zoneNames: [zoneName],
      });
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
      setIsLoadZoneDialogOpen(false);
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
    if (hasPendingChanges) {
      await showToastSafe({
        text: t('offline.cache.refreshBlockedPendingChanges'),
        duration: 'short',
        position: 'bottom',
      });
      return;
    }

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

  async function confirmDeleteCache() {
    setDeleteAlert(null);
    await handleDeleteCache();
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

  async function confirmDeleteLayer(layerKey: string) {
    setDeleteAlert(null);
    await handleDeleteLayer(layerKey);
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
          <OfflineStatusSection
            mode={mode}
            hasOfflineData={hasOfflineData}
            isOfflineAllowed={isOfflineAllowed}
            canToggleOfflineMode={canToggleOfflineMode}
            hasLoadedCache={hasLoadedCache}
            activeCommunityCache={activeCommunityCache}
            refreshedAt={refreshedAt}
            isDownloading={isDownloading}
            downloadProgress={downloadProgress}
            inlineError={inlineError}
            onToggleOfflineMode={(checked) => void handleToggleOfflineMode(checked)}
            onCancelDownload={cancelOfflineDownload}
          />

          <OfflineZonesSection
            zones={zones}
            activeCommunityCache={activeCommunityCache}
            hasLoadedCache={hasLoadedCache}
            isDownloading={isDownloading}
            onOpenNewZoneDialog={openNewZoneDialog}
            onAddZoneToCache={(zoneName) => void handleAddZoneToCache(zoneName)}
            onRequestDeleteZone={(zoneName) => setDeleteAlert({ kind: 'zone', zoneName })}
          />

          <OfflineLayersSection
            currentCacheLayers={currentCacheLayers}
            hasLoadedCache={hasLoadedCache}
            selectedLayerKeys={selectedLayerKeys}
            isOfflineAllowed={isOfflineAllowed}
            isDownloading={isDownloading}
            canOpenLayerPicker={canOpenLayerPicker}
            onOpenLayerPicker={openLayerPicker}
            onRefreshLayer={(layerKey) => void handleRefreshLayer(layerKey)}
            onRequestDeleteLayer={(layerKey) => setDeleteAlert({ kind: 'layer', layerKey })}
          />

          <OfflineCacheSection
            hasLoadedCache={hasLoadedCache}
            currentLayerCount={currentCacheLayers.length}
            zoneCount={zones.length}
            loadedLayerCount={activeCommunityCache?.layers.length ?? 0}
            loadedZoneCount={activeCommunityCache?.zoneNames.length ?? 0}
            canLoadInitialCache={canLoadInitialCache}
            canRefresh={canRefresh}
            canDeleteCache={canDeleteCache}
            isDownloading={isDownloading}
            onOpenLoadDialog={handleOpenLoadDialog}
            onRefreshCache={() => void handleRefreshCache()}
            onRequestDeleteCache={() => setDeleteAlert({ kind: 'cache' })}
          />

          <OfflineRasterSection
            rasterMaps={rasterMaps}
            zones={zones}
            rasterScaleOptions={rasterScaleOptions}
            isDownloading={isDownloading}
            onOpenNewRasterMapDialog={openNewRasterMapDialog}
            onToggleRasterMapVisibility={(mapId, visible) => void handleToggleRasterMapVisibility(mapId, visible)}
            onOpenRasterZoneDialog={openRasterZoneDialog}
            onRefreshRasterMap={(mapId) => void handleRefreshRasterMap(mapId)}
            onRequestDeleteRasterMap={(mapId) => setDeleteAlert({ kind: 'raster-map', mapId })}
          />
        </main>
      </SlideUpPage>

      <OfflineDialogs
        isNewZoneDialogOpen={isNewZoneDialogOpen}
        newZoneName={newZoneName}
        newZoneMode={newZoneMode}
        newZoneLayerKey={newZoneLayerKey}
        hasPolygonLayer={hasPolygonLayer}
        polygonLayers={polygonLayers}
        onCloseNewZoneDialog={() => setIsNewZoneDialogOpen(false)}
        onChangeNewZoneName={setNewZoneName}
        onChangeNewZoneMode={setNewZoneMode}
        onChangeNewZoneLayerKey={setNewZoneLayerKey}
        onStartZoneEditor={startZoneEditor}
        layerPickerMode={layerPickerMode}
        addableLayers={addableLayers}
        eligibleLayers={eligibleLayers}
        layerPickerLayers={layerPickerLayers}
        layerPickerKeys={layerPickerKeys}
        areAllLayerPickerLayersSelected={areAllLayerPickerLayersSelected}
        onCloseLayerPicker={closeLayerPicker}
        onToggleAllLayerPickerLayers={handleToggleAllLayerPickerLayers}
        onToggleLayerPickerKey={toggleLayerPickerKey}
        onValidateLayerPicker={() => void handleValidateLayerPicker()}
        isLoadZoneDialogOpen={isLoadZoneDialogOpen}
        zones={zones}
        onCloseLoadZoneDialog={() => setIsLoadZoneDialogOpen(false)}
        onLoadCacheForZone={(zoneName) => void loadCacheForZone(zoneName)}
        isNewRasterMapDialogOpen={isNewRasterMapDialogOpen}
        newRasterMapName={newRasterMapName}
        newRasterMapLayerName={newRasterMapLayerName}
        newRasterMapMinZoom={newRasterMapMinZoom}
        newRasterMapMaxZoom={newRasterMapMaxZoom}
        geoportailLayerOptions={geoportailLayerOptions}
        rasterScaleOptions={rasterScaleOptions}
        isExpertMode={EXPERT_MODE}
        onCloseNewRasterMapDialog={() => setIsNewRasterMapDialogOpen(false)}
        onChangeNewRasterMapName={setNewRasterMapName}
        onChangeNewRasterMapLayerName={setNewRasterMapLayerName}
        onChangeNewRasterMapMinZoom={setNewRasterMapMinZoom}
        onChangeNewRasterMapMaxZoom={setNewRasterMapMaxZoom}
        onValidateNewRasterMap={() => void handleValidateNewRasterMap()}
        isRasterZoneDialogOpen={rasterZoneDialog !== null}
        rasterZoneDialogMode={rasterZoneDialog?.mode ?? null}
        rasterZoneDialogSubtitle={rasterMapForZoneDialog?.name}
        rasterZoneDialogZones={rasterZoneDialogZones}
        onCloseRasterZoneDialog={() => setRasterZoneDialog(null)}
        isRasterPreviewLoading={isRasterPreviewLoading}
        rasterDownloadPreview={rasterDownloadPreview?.preview ?? null}
        rasterDownloadPreviewMapName={rasterDownloadPreview?.mapName ?? null}
        rasterDownloadPreviewZoneName={rasterDownloadPreview?.zoneName ?? null}
        onSelectRasterZone={(zoneName) => {
          void handleOpenRasterDownloadPreview(
            rasterMapForZoneDialog!,
            rasterZoneDialog!.mode,
            zoneName
          );
        }}
        onCloseRasterDownloadPreview={closeRasterDownloadPreview}
        onConfirmRasterDownloadPreview={() => {
          void handleConfirmRasterDownloadPreview();
        }}
        isDeleteAlertOpen={deleteAlert !== null}
        deleteAlertTitle={getDeleteAlertTitle()}
        deleteAlertSubtitle={getDeleteAlertSubtitle()}
        onCloseDeleteAlert={() => setDeleteAlert(null)}
        onConfirmDeleteAlert={() => {
          void confirmDeleteAlert();
        }}
      />
    </>
  );
}
