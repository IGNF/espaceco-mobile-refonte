import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type Map from 'ol/Map';
import type { Extent } from 'ol/extent';
import { useCommunity } from '@/features/community/hooks/useCommunity';
import { useAppSettings } from '@/features/settings/hooks/useAppSettings';

import type { CommunityLayer } from '@ign/mobile-core';

import { useOffline } from '@/features/offline/hooks/useOffline';
import { OfflineStatusSection } from '@/features/offline/components/OfflineManager/sections/OfflineStatusSection';
import { OfflineZonesSection } from '@/features/offline/components/OfflineManager/sections/OfflineZonesSection';
import { OfflineLayersSection } from '@/features/offline/components/OfflineManager/sections/OfflineLayersSection';
import { OfflineCacheSection } from '@/features/offline/components/OfflineManager/sections/OfflineCacheSection';
import { OfflineRasterSection } from '@/features/offline/components/OfflineManager/sections/OfflineRasterSection';
import { NewZoneDialog } from '@/features/offline/components/OfflineManager/dialogs/NewZoneDialog';
import { LayerPickerDialog } from '@/features/offline/components/OfflineManager/dialogs/LayerPickerDialog';
import { LoadZoneDialog } from '@/features/offline/components/OfflineManager/dialogs/LoadZoneDialog';
import { NewRasterMapDialog } from '@/features/offline/components/OfflineManager/dialogs/NewRasterMapDialog';
import { RasterZoneDialog } from '@/features/offline/components/OfflineManager/dialogs/RasterZoneDialog';
import { RasterDownloadPreviewDialog } from '@/features/offline/components/OfflineManager/dialogs/RasterDownloadPreviewDialog';
import { RenameRasterMapDialog } from '@/features/offline/components/OfflineManager/dialogs/RenameRasterMapDialog';
import { DeleteOfflineItemDialog } from '@/features/offline/components/OfflineManager/dialogs/DeleteOfflineItemDialog';

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

import { DEFAULT_GEOPORTAIL_LAYERS } from '@/shared/constants/map';

import screen from '@/shared/styles/screen.module.css';

import type {
  OfflineCacheDownloadResult,
  OfflineRasterDownloadPreview,
  OfflineRasterMap,
  OfflineZoneEditorMode,
} from '@/domain/offline/models';
import { OfflineZoneEditorOverlay } from './OfflineZoneEditorOverlay';

import styles from './OfflineManagementPage.module.css';
import { Divider } from '@/shared/ui/Divider/Divider';

type LayerPickerMode = 'draft-cache' | 'loaded-cache';
type DeleteAlertState =
  | { kind: 'zone'; zoneName: string }
  | { kind: 'layer'; layerKey: string; layerTitle: string }
  | { kind: 'raster-map'; mapId: string }
  | { kind: 'cache' };

interface ZoneEditorState {
  name: string;
  mode: OfflineZoneEditorMode;
  layerKey: string | null;
  restoreLayerVisibility: boolean;
}

type RasterZoneDialogState =
  | { kind: 'single-map'; mapId: string; mode: 'load-map' | 'add-zone' }
  | { kind: 'pending-maps' };

interface RasterDownloadPreviewState {
  rasterMaps: OfflineRasterMap[];
  mapName: string;
  zoneName: string;
  preview: OfflineRasterDownloadPreview;
}

interface RenameRasterMapDialogState {
  mapId: string;
  name: string;
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
  const { displayMode } = useAppSettings();
  const {
    mode,
    activeCommunityId,
    activeCommunityCache,
    isOfflineAllowed,
    hasOfflineData,
    rasterMaps,
    zones,
    isDownloading,
    isCancellingDownload,
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
    retryOfflineRasterMapFailedTiles,
    setOfflineRasterMapVisibility,
    renameOfflineRasterMap,
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
  const [rasterMapIdBeingPreviewed, setRasterMapIdBeingPreviewed] = useState<string | null>(null);
  const [isPendingRasterPreviewLoading, setIsPendingRasterPreviewLoading] = useState(false);
  const [renameRasterMapDialog, setRenameRasterMapDialog] = useState<RenameRasterMapDialogState | null>(null);
  const [deleteAlert, setDeleteAlert] = useState<DeleteAlertState | null>(null);
  const [isSavingZone, setIsSavingZone] = useState(false);
  const [isNewRasterMapSubmitting, setIsNewRasterMapSubmitting] = useState(false);
  const [zoneNameBeingAddedToCache, setZoneNameBeingAddedToCache] = useState<string | null>(null);
  const [isLayerPickerSubmitting, setIsLayerPickerSubmitting] = useState(false);
  const [isAddingLayersToCache, setIsAddingLayersToCache] = useState(false);
  const [isLoadingInitialCache, setIsLoadingInitialCache] = useState(false);
  const [isRefreshingCache, setIsRefreshingCache] = useState(false);
  const [layerKeyBeingRefreshed, setLayerKeyBeingRefreshed] = useState<string | null>(null);
  const [rasterMapIdBeingRefreshed, setRasterMapIdBeingRefreshed] = useState<string | null>(null);
  const [rasterMapIdBeingRetried, setRasterMapIdBeingRetried] = useState<string | null>(null);
  const [isRenameRasterMapSubmitting, setIsRenameRasterMapSubmitting] = useState(false);
  const [isDeleteAlertProcessing, setIsDeleteAlertProcessing] = useState(false);

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
  const displayedCurrentCacheLayers = [...currentCacheLayers].reverse();
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
  const displayedLayerPickerLayers = [...layerPickerLayers].reverse();
  const areAllLayerPickerLayersSelected =
    layerPickerLayers.length > 0 && layerPickerKeys.length === layerPickerLayers.length;
  const currentZoneEditorLayer = zoneEditorState?.layerKey
    ? eligibleLayers.find((layer) => getCommunityLayerKey(layer) === zoneEditorState.layerKey) ?? null
    : null;
  const rasterMapToDelete = deleteAlert?.kind === 'raster-map'
    ? rasterMaps.find((rasterMap) => rasterMap.id === deleteAlert.mapId) ?? null
    : null;
  const rasterMapForZoneDialog = rasterZoneDialog
    && rasterZoneDialog.kind === 'single-map'
    ? rasterMaps.find((rasterMap) => rasterMap.id === rasterZoneDialog.mapId)!
    : null;
  const rasterZoneDialogZones =
    rasterZoneDialog?.kind === 'single-map' && rasterZoneDialog.mode === 'add-zone'
      ? zones.filter((zone) => !rasterMapForZoneDialog!.zoneNames.includes(zone.name))
      : zones;
  const pendingRasterMaps = rasterMaps.filter((rasterMap) => !rasterMap.loaded);
  const rasterZoneDialogMode =
    rasterZoneDialog?.kind === 'pending-maps'
      ? 'pending-maps'
      : rasterZoneDialog?.mode ?? null;
  const isRasterZonePreviewLoading =
    isPendingRasterPreviewLoading || rasterMapIdBeingPreviewed !== null;
  const isPreparingDownload =
    isAddingLayersToCache ||
    isLoadingInitialCache ||
    isRefreshingCache ||
    zoneNameBeingAddedToCache !== null ||
    layerKeyBeingRefreshed !== null ||
    rasterMapIdBeingRefreshed !== null;

  useEffect(() => {
    if (isPreparingDownload || isDownloading) {
      scrollToTop();
    }
  }, [isPreparingDownload, isDownloading]);

  async function showOfflineError(error: unknown): Promise<void> {
    await showToastSafe({
      text: getUserFacingErrorMessage(error, t, 'errors.global.unknown'),
      duration: 'short',
      position: 'bottom',
    });
  }

  async function showRasterDownloadToast(
    operationFailedTileCount: number,
    rasterMapCount: number,
    successMessage: string
  ): Promise<void> {
    if (operationFailedTileCount === 0) {
      await showToastSafe({
        text: successMessage,
        duration: 'short',
        position: 'bottom',
      });
      return;
    }

    await showToastSafe({
      text: rasterMapCount === 1
        ? t('offline.raster.downloadWithErrors', { count: operationFailedTileCount })
        : t('offline.raster.downloadWithErrorsMultiple', { count: operationFailedTileCount }),
      duration: 'short',
      position: 'bottom',
    });
  }

  async function showCacheDownloadToast(result: OfflineCacheDownloadResult, successMessage: string): Promise<void> {
    const emptyLayers = result.layers.filter((layer) => layer.loadedObjectCount === 0);

    if (emptyLayers.length === 0) {
      await showToastSafe({
        text: successMessage,
        duration: 'short',
        position: 'bottom',
      });
      return;
    }

    await showToastSafe({
      text: emptyLayers.length === 1
        ? t('offline.layers.noObjectLoaded', { title: emptyLayers[0].layerTitle })
        : t('offline.layers.noObjectLoadedMultiple', { count: emptyLayers.length }),
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
    setIsSavingZone(true);

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
    } finally {
      setIsSavingZone(false);
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
      throw error;
    }
  }

  function openNewRasterMapDialog() {
    setNewRasterMapName(`Carte #${rasterMaps.length + 1}`);
    setNewRasterMapLayerName(DEFAULT_GEOPORTAIL_LAYERS[0]);
    setNewRasterMapMinZoom(15);
    setNewRasterMapMaxZoom(15);
    setIsNewRasterMapDialogOpen(true);
  }

  async function handleValidateNewRasterMap() {
    setIsNewRasterMapSubmitting(true);

    try {
      const savedRasterMap = await saveOfflineRasterMapDraft({
        name: newRasterMapName.trim(),
        layerName: newRasterMapLayerName,
        minZoom: displayMode === 'expert'
          ? Math.min(newRasterMapMinZoom, newRasterMapMaxZoom)
          : newRasterMapMaxZoom,
        maxZoom: displayMode === 'expert'
          ? Math.max(newRasterMapMinZoom, newRasterMapMaxZoom)
          : newRasterMapMaxZoom,
      });

      if (zones.length === 0) {
        setIsNewRasterMapDialogOpen(false);
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
          zones[0].name
        );
        setIsNewRasterMapDialogOpen(false);
        return;
      }

      setIsNewRasterMapDialogOpen(false);
      setRasterZoneDialog({
        kind: 'single-map',
        mapId: savedRasterMap.id,
        mode: 'load-map',
      });
    } catch (error) {
      await showOfflineError(error);
    } finally {
      setIsNewRasterMapSubmitting(false);
    }
  }

  async function handleDownloadRasterMaps(
    rasterMapsToDownload: OfflineRasterMap[],
    zoneName: string
  ) {
    try {
      setRasterZoneDialog(null);
      setRasterDownloadPreview(null);
      let operationFailedTileCount = 0;

      for (const rasterMap of rasterMapsToDownload) {
        const downloadedRasterMap = await downloadOfflineRasterMap(rasterMap.id, zoneName);
        const previousFailedTileCount = rasterMap.loaded ? rasterMap.failedTileCoords.length : 0;
        const newFailedTileCount = downloadedRasterMap.failedTileCoords.length - previousFailedTileCount;

        operationFailedTileCount += newFailedTileCount;
      }

      await showRasterDownloadToast(
        operationFailedTileCount,
        rasterMapsToDownload.length,
        rasterMapsToDownload.length === 1
          ? t('offline.raster.downloadSuccess')
          : t('offline.raster.pendingDownloadSuccess')
      );
    } catch (error) {
      await showOfflineError(error);
    }
  }

  /**
   * Resolves the raster download preview first, then opens the confirmation alert.
   */
  async function handleOpenRasterDownloadPreview(
    rasterMap: OfflineRasterMap,
    zoneName: string
  ) {
    try {
      setRasterMapIdBeingPreviewed(rasterMap.id);

      const preview = await previewOfflineRasterMapDownload(rasterMap, zoneName);

      setRasterZoneDialog(null);
      setRasterDownloadPreview({
        rasterMaps: [rasterMap],
        mapName: rasterMap.name,
        zoneName,
        preview,
      });
    } catch (error) {
      await showOfflineError(error);
    } finally {
      setRasterMapIdBeingPreviewed(null);
    }
  }

  /**
   * Builds one confirmation preview for the legacy-style "load all pending maps" action.
   */
  async function handleOpenPendingRasterMapsDownloadPreview(zoneName: string) {
    try {
      setIsPendingRasterPreviewLoading(true);

      const previews = await Promise.all(
        pendingRasterMaps.map((rasterMap) =>
          previewOfflineRasterMapDownload(rasterMap, zoneName)
        )
      );
      const freeDiskSpaceMb = previews.find(
        (preview) => preview.freeDiskSpaceMb != null
      )?.freeDiskSpaceMb ?? null;
      const tileCount = previews.reduce((total, preview) => total + preview.tileCount, 0);
      const estimatedSizeMb = Math.round(previews.reduce(
        (total, preview) => total + preview.estimatedSizeMb,
        0
      ) * 10) / 10;
      const estimatedTimeMs = previews.reduce(
        (total, preview) => total + preview.estimatedTimeMs,
        0
      );

      setRasterZoneDialog(null);
      setRasterDownloadPreview({
        rasterMaps: pendingRasterMaps,
        mapName: t('offline.raster.pendingMapsPreviewName', {
          count: pendingRasterMaps.length,
        }),
        zoneName,
        preview: {
          tileCount,
          estimatedSizeMb,
          estimatedTimeMs,
          freeDiskSpaceMb,
        },
      });
    } catch (error) {
      await showOfflineError(error);
    } finally {
      setIsPendingRasterPreviewLoading(false);
    }
  }

  /**
   * Starts the raster download from the preview already confirmed by the user.
   */
  async function handleConfirmRasterDownloadPreview() {
    await handleDownloadRasterMaps(
      rasterDownloadPreview!.rasterMaps,
      rasterDownloadPreview!.zoneName
    );
  }

  /**
   * Closes the preview and returns to the zone choice step for the same raster map.
   */
  function closeRasterDownloadPreview() {
    setRasterDownloadPreview(null);
  }

  function openRasterZoneDialog(mapId: string, mode: 'load-map' | 'add-zone') {
    const rasterMap = rasterMaps.find((currentRasterMap) => currentRasterMap.id === mapId)!;

    if (zones.length === 1) {
      void handleOpenRasterDownloadPreview(
        rasterMap,
        zones[0].name
      );
      return;
    }

    setRasterZoneDialog({
      kind: 'single-map',
      mapId,
      mode,
    });
  }

  function openPendingRasterMapsDownload() {
    if (zones.length === 1) {
      void handleOpenPendingRasterMapsDownloadPreview(zones[0].name);
      return;
    }

    setRasterZoneDialog({ kind: 'pending-maps' });
  }

  function selectRasterZone(zoneName: string) {
    if (rasterZoneDialog!.kind === 'pending-maps') {
      void handleOpenPendingRasterMapsDownloadPreview(zoneName);
    }
    else {
      void handleOpenRasterDownloadPreview(
        rasterMapForZoneDialog!,
        zoneName
      );
    }
  }

  async function handleRefreshRasterMap(mapId: string) {
    setRasterMapIdBeingRefreshed(mapId);

    try {
      const refreshedRasterMap = await refreshOfflineRasterMap(mapId);
      await showRasterDownloadToast(refreshedRasterMap.failedTileCoords.length, 1, t('offline.raster.refreshSuccess'));
    } catch (error) {
      await showOfflineError(error);
    } finally {
      setRasterMapIdBeingRefreshed(null);
    }
  }

  async function handleRetryRasterMapFailedTiles(mapId: string) {
    setRasterMapIdBeingRetried(mapId);

    try {
      const retriedRasterMap = await retryOfflineRasterMapFailedTiles(mapId);
      await showRasterDownloadToast(
        retriedRasterMap.failedTileCoords.length,
        1,
        t('offline.raster.retryFailedTilesSuccess')
      );
    } catch (error) {
      await showOfflineError(error);
    } finally {
      setRasterMapIdBeingRetried(null);
    }
  }

  async function handleToggleRasterMapVisibility(mapId: string, visible: boolean) {
    try {
      await setOfflineRasterMapVisibility(mapId, visible);
    } catch (error) {
      await showOfflineError(error);
    }
  }

  function openRenameRasterMapDialog(mapId: string) {
    const rasterMap = rasterMaps.find((currentRasterMap) => currentRasterMap.id === mapId)!;
    setRenameRasterMapDialog({
      mapId,
      name: rasterMap.name,
    });
  }

  async function handleRenameRasterMap() {
    setIsRenameRasterMapSubmitting(true);

    try {
      await renameOfflineRasterMap(
        renameRasterMapDialog!.mapId,
        renameRasterMapDialog!.name.trim()
      );
      setRenameRasterMapDialog(null);
      await showToastSafe({
        text: t('offline.raster.renameSuccess'),
        duration: 'short',
        position: 'bottom',
      });
    } catch (error) {
      await showOfflineError(error);
    } finally {
      setIsRenameRasterMapSubmitting(false);
    }
  }

  function handleCenterRasterMap(mapId: string) {
    const rasterMap = rasterMaps.find((currentRasterMap) => currentRasterMap.id === mapId)!;

    map!.getView().fit(rasterMap.extent!, {
      duration: 300,
      maxZoom: rasterMap.maxZoom,
      padding: [80, 40, 80, 40],
    });
    onClose();
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
      throw error;
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
          title: deleteAlert.layerTitle,
        });
      }

      return t('offline.layers.confirmDeleteMessage', {
        title: deleteAlert.layerTitle,
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

  /**
   * Runs the currently opened delete confirmation.
   * One shared handler keeps the alert loading state identical for every delete type.
   */
  async function confirmDeleteAlert() {
    setIsDeleteAlertProcessing(true);
    const deleteTarget = deleteAlert!;

    try {
      if (deleteTarget.kind === 'zone') {
        await handleDeleteZone(deleteTarget.zoneName);
      }
      else if (deleteTarget.kind === 'layer') {
        await handleDeleteLayer(deleteTarget.layerKey);
      }
      else if (deleteTarget.kind === 'raster-map') {
        await handleDeleteRasterMap(deleteTarget.mapId);
      }
      else { // Whole cache
        await handleDeleteCache();
      }

      setDeleteAlert(null);
    } finally {
      setIsDeleteAlertProcessing(false);
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
    setIsLayerPickerSubmitting(false);
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
    setIsLayerPickerSubmitting(true);

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
      } finally {
        setIsLayerPickerSubmitting(false);
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

    setIsAddingLayersToCache(true);
    try {
      closeLayerPicker();
      const result = await downloadCommunityCache({
        communityId: activeCommunityId!,
        layers: selectedLayers,
        zoneNames: [],
      });
      await showCacheDownloadToast(result, t('offline.cache.layersAddedSuccess'));
    } catch (error) {
      await showOfflineError(error);
    } finally {
      setIsLayerPickerSubmitting(false);
      setIsAddingLayersToCache(false);
    }
  }

  /**
   * Performs the first cache load for one chosen zone.
   */
  async function loadCacheForZone(zoneName: string) {
    setIsLoadingInitialCache(true);

    try {
      setIsLoadZoneDialogOpen(false);
      const result = await downloadCommunityCache({
        communityId: activeCommunityId!,
        layers: currentCacheLayers,
        zoneNames: [zoneName],
      });
      await showCacheDownloadToast(result, t('offline.cache.downloadSuccess'));
    } catch (error) {
      await showOfflineError(error);
    } finally {
      setIsLoadingInitialCache(false);
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
    setZoneNameBeingAddedToCache(zoneName);

    try {
      setIsLoadZoneDialogOpen(false);
      const result = await downloadCommunityCache({
        communityId: activeCommunityId!,
        layers: [],
        zoneNames: [zoneName],
      });
      await showCacheDownloadToast(result, t('offline.cache.zoneAddedSuccess'));
    } catch (error) {
      await showOfflineError(error);
    } finally {
      setZoneNameBeingAddedToCache(null);
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

    setIsRefreshingCache(true);

    try {
      const result = await refreshCommunityCache(activeCommunityId!);
      await showCacheDownloadToast(result, t('offline.cache.refreshSuccess'));
    } catch (error) {
      await showOfflineError(error);
    } finally {
      setIsRefreshingCache(false);
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
      throw error;
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
      throw error;
    }
  }

  async function handleRefreshLayer(layerKey: string) {
    setLayerKeyBeingRefreshed(layerKey);

    try {
      const result = await refreshCommunityCacheLayer(activeCommunityId!, layerKey);
      await showCacheDownloadToast(result, t('offline.layers.refreshSuccess'));
    } catch (error) {
      await showOfflineError(error);
    } finally {
      setLayerKeyBeingRefreshed(null);
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
        isSaving={isSavingZone}
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
            isPreparingDownload={isPreparingDownload}
            isDownloading={isDownloading}
            isCancellingDownload={isCancellingDownload}
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
            zoneNameBeingAddedToCache={zoneNameBeingAddedToCache}
            onOpenNewZoneDialog={openNewZoneDialog}
            onAddZoneToCache={(zoneName) => void handleAddZoneToCache(zoneName)}
            onRequestDeleteZone={(zoneName) => setDeleteAlert({ kind: 'zone', zoneName })}
          />

          <OfflineLayersSection
            currentCacheLayers={displayedCurrentCacheLayers}
            hasLoadedCache={hasLoadedCache}
            selectedLayerKeys={selectedLayerKeys}
            isOfflineAllowed={isOfflineAllowed}
            isDownloading={isDownloading}
            layerKeyBeingRefreshed={layerKeyBeingRefreshed}
            canOpenLayerPicker={canOpenLayerPicker}
            onOpenLayerPicker={openLayerPicker}
            onRefreshLayer={(layerKey) => void handleRefreshLayer(layerKey)}
            onRequestDeleteLayer={(layerKey) => {
              const layer = currentCacheLayers.find(
                (currentLayer) => getCommunityLayerKey(currentLayer) === layerKey
              )!;

              setDeleteAlert({
                kind: 'layer',
                layerKey,
                layerTitle: getCommunityLayerTitle(layer),
              });
            }}
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
            isLoadingInitialCache={isLoadingInitialCache}
            isRefreshingCache={isRefreshingCache}
            onOpenLoadDialog={handleOpenLoadDialog}
            onRefreshCache={() => void handleRefreshCache()}
            onRequestDeleteCache={() => setDeleteAlert({ kind: 'cache' })}
          />

          <Divider color="light" thickness="thin" width={80} />

          <OfflineRasterSection
            rasterMaps={rasterMaps}
            zones={zones}
            rasterScaleOptions={rasterScaleOptions}
            isDownloading={isDownloading}
            isPendingRasterPreviewLoading={isPendingRasterPreviewLoading}
            rasterMapIdBeingPreviewed={rasterMapIdBeingPreviewed}
            rasterMapIdBeingRefreshed={rasterMapIdBeingRefreshed}
            rasterMapIdBeingRetried={rasterMapIdBeingRetried}
            canCenterRasterMaps={map !== null}
            onOpenNewRasterMapDialog={openNewRasterMapDialog}
            onDownloadPendingRasterMaps={openPendingRasterMapsDownload}
            onToggleRasterMapVisibility={(mapId, visible) => void handleToggleRasterMapVisibility(mapId, visible)}
            onCenterRasterMap={handleCenterRasterMap}
            onOpenRasterZoneDialog={openRasterZoneDialog}
            onRefreshRasterMap={(mapId) => void handleRefreshRasterMap(mapId)}
            onRetryRasterMapFailedTiles={(mapId) => void handleRetryRasterMapFailedTiles(mapId)}
            onRequestRenameRasterMap={openRenameRasterMapDialog}
            onRequestDeleteRasterMap={(mapId) => setDeleteAlert({ kind: 'raster-map', mapId })}
          />
        </main>
      </SlideUpPage>

      <NewZoneDialog
        isOpen={isNewZoneDialogOpen}
        name={newZoneName}
        mode={newZoneMode}
        layerKey={newZoneLayerKey}
        hasPolygonLayer={hasPolygonLayer}
        polygonLayers={polygonLayers}
        onClose={() => setIsNewZoneDialogOpen(false)}
        onChangeName={setNewZoneName}
        onChangeMode={setNewZoneMode}
        onChangeLayerKey={setNewZoneLayerKey}
        onContinue={startZoneEditor}
      />

      <LayerPickerDialog
        mode={layerPickerMode}
        addableLayers={addableLayers}
        eligibleLayers={eligibleLayers}
        layers={displayedLayerPickerLayers}
        selectedKeys={layerPickerKeys}
        areAllLayersSelected={areAllLayerPickerLayersSelected}
        isSubmitting={isLayerPickerSubmitting}
        onClose={closeLayerPicker}
        onToggleAllLayers={handleToggleAllLayerPickerLayers}
        onToggleLayer={toggleLayerPickerKey}
        onValidate={() => void handleValidateLayerPicker()}
      />

      <LoadZoneDialog
        isOpen={isLoadZoneDialogOpen}
        zones={zones}
        onClose={() => setIsLoadZoneDialogOpen(false)}
        onSelectZone={(zoneName) => void loadCacheForZone(zoneName)}
      />

      <NewRasterMapDialog
        isOpen={isNewRasterMapDialogOpen}
        isSubmitting={isNewRasterMapSubmitting}
        name={newRasterMapName}
        layerName={newRasterMapLayerName}
        minZoom={newRasterMapMinZoom}
        maxZoom={newRasterMapMaxZoom}
        geoportailLayerOptions={geoportailLayerOptions}
        rasterScaleOptions={rasterScaleOptions}
        displayMode={displayMode}
        onClose={() => {
          if (!isNewRasterMapSubmitting) {
            setIsNewRasterMapDialogOpen(false);
          }
        }}
        onChangeName={setNewRasterMapName}
        onChangeLayerName={setNewRasterMapLayerName}
        onChangeMinZoom={setNewRasterMapMinZoom}
        onChangeMaxZoom={setNewRasterMapMaxZoom}
        onValidate={() => void handleValidateNewRasterMap()}
      />

      <RasterZoneDialog
        isOpen={rasterZoneDialog !== null}
        mode={rasterZoneDialogMode}
        subtitle={rasterMapForZoneDialog?.name}
        zones={rasterZoneDialogZones}
        isPreviewLoading={isRasterZonePreviewLoading}
        onClose={() => setRasterZoneDialog(null)}
        onSelectZone={selectRasterZone}
      />

      <RasterDownloadPreviewDialog
        preview={rasterDownloadPreview?.preview ?? null}
        mapName={rasterDownloadPreview?.mapName ?? null}
        zoneName={rasterDownloadPreview?.zoneName ?? null}
        onClose={closeRasterDownloadPreview}
        onConfirm={() => {
          void handleConfirmRasterDownloadPreview();
        }}
      />

      <RenameRasterMapDialog
        isOpen={renameRasterMapDialog !== null}
        name={renameRasterMapDialog?.name ?? ''}
        isSubmitting={isRenameRasterMapSubmitting}
        onClose={() => {
          if (!isRenameRasterMapSubmitting) {
            setRenameRasterMapDialog(null);
          }
        }}
        onChangeName={(name) => setRenameRasterMapDialog({
          ...renameRasterMapDialog!,
          name,
        })}
        onValidate={() => {
          void handleRenameRasterMap();
        }}
      />

      <DeleteOfflineItemDialog
        isOpen={deleteAlert !== null}
        title={getDeleteAlertTitle()}
        subtitle={getDeleteAlertSubtitle()}
        isProcessing={isDeleteAlertProcessing}
        onClose={() => {
          if (!isDeleteAlertProcessing) {
            setDeleteAlert(null);
          }
        }}
        onConfirm={() => {
          void confirmDeleteAlert();
        }}
      />
    </>
  );
}
