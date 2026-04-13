import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { PluginListenerHandle } from '@capacitor/core';
import type { CommunityLayer } from '@ign/mobile-core';
import type { Extent } from 'ol/extent';
import { Network } from '@ign/mobile-device';
import {
  type OfflineCommunityCache,
  type OfflineDownloadProgress,
  type OfflineMode,
  type OfflineNetworkStatus,
  type OfflineCacheDraftInput,
  type OfflineCacheDownloadInput,
  type OfflineCacheLayer,
  type OfflineZone,
} from '@/domain/offline/models';
import { useCommunity } from '@/features/community/hooks/useCommunity';
import { OfflineCacheRepository } from '@/infra/offline/OfflineCacheRepository';
import { OfflineModeRepository } from '@/infra/offline/OfflineModeRepository';
import {
  OFFLINE_DOWNLOAD_CANCELLED_CODE,
  OfflineVectorDownloadService,
} from '@/infra/offline/OfflineVectorDownloadService';
import { OfflineZonesRepository } from '@/infra/offline/OfflineZonesRepository';
import { AppError, isAppError, toAppError } from '@/shared/errors/appError';
import { getCommunityLayerKey } from '@/shared/utils/layerKey';
import { OfflineContext } from './OfflineContext';

interface OfflineProviderProps {
  children: ReactNode;
}

const offlineCacheRepository = new OfflineCacheRepository();
const offlineModeRepository = new OfflineModeRepository();
const offlineZonesRepository = new OfflineZonesRepository();
const offlineVectorDownloadService = new OfflineVectorDownloadService();

const DEFAULT_NETWORK_STATUS: OfflineNetworkStatus = {
  connected: true,
  connectionType: 'unknown',
};

/**
 * Reads the current network state.
 * Falls back to a neutral "connected/unknown" status when the plugin is unavailable.
 */
async function getNetworkStatus(): Promise<OfflineNetworkStatus> {
  try {
    return await Network.getStatus();
  } catch {
    return DEFAULT_NETWORK_STATUS;
  }
}

export function OfflineProvider({ children }: OfflineProviderProps) {
  const { activeCommunity } = useCommunity();
  const activeCommunityId = activeCommunity?.id ?? null;
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] =
    useState<OfflineDownloadProgress | null>(null);
  const [downloadError, setDownloadError] = useState<AppError | null>(null);
  const [requestedMode, setRequestedModeState] = useState<OfflineMode>('online');
  const [network, setNetwork] = useState<OfflineNetworkStatus>(DEFAULT_NETWORK_STATUS);
  const [zones, setZones] = useState<OfflineZone[]>([]);
  const [caches, setCaches] = useState<OfflineCommunityCache[]>([]);

  /**
   * Reloads the persisted offline state used by the provider.
   * This keeps repositories as the source of truth after each write operation.
   */
  const refresh = useCallback(async () => {
    setIsLoading(true);

    try {
      const [nextRequestedMode, nextNetworkStatus, nextZones, nextCaches] = await Promise.all([
        offlineModeRepository.getRequestedMode(),
        getNetworkStatus(),
        offlineZonesRepository.listZones(),
        offlineCacheRepository.listCaches(),
      ]);

      setRequestedModeState(nextRequestedMode);
      setNetwork(nextNetworkStatus);
      setZones(nextZones);
      setCaches(nextCaches);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    let isActive = true;
    let listener: PluginListenerHandle | null = null;

    void getNetworkStatus().then((nextNetworkStatus) => {
      if (isActive) {
        setNetwork(nextNetworkStatus);
      }
    });

    void Network.watch((status) => {
      if (!isActive) {
        return;
      }

      setNetwork(status);
    }).then((handle) => {
      if (!isActive) {
        void Network.unwatch(handle);
        return;
      }

      listener = handle;
    });

    return () => {
      isActive = false;

      if (listener) {
        void Network.unwatch(listener);
      }
    };
  }, []);

  const activeCommunityCache =
    activeCommunityId == null
      ? null
      : caches.find((offlineCache) => offlineCache.communityId === activeCommunityId) ?? null;

  const isOfflineAllowed = activeCommunity?.offline_allowed !== false;
  const hasOfflineData = activeCommunityCache?.loaded === true;
  const canEnableOffline = isOfflineAllowed && hasOfflineData;
  const mode: OfflineMode =
    requestedMode === 'offline' && canEnableOffline ? 'offline' : 'online';

  const setOfflineMode = useCallback(
    async (nextMode: OfflineMode) => {
      if (nextMode === 'offline' && !canEnableOffline) {
        throw new AppError({ kind: 'validation', translationKey: 'errors.global.validation', message: 'Offline mode cannot be enabled without a loaded offline cache', retryable: false });
      }

      if (nextMode === 'online' && requestedMode === 'offline' && !network.connected) {
        throw new AppError({ kind: 'network', translationKey: 'errors.global.network', message: 'A network connection is required to switch back online' });
      }

      const persistedMode = await offlineModeRepository.saveRequestedMode(nextMode);
      setRequestedModeState(persistedMode);
    },
    [canEnableOffline, network.connected, requestedMode]
  );

  const saveZone = useCallback(async (name: string, extents: Extent | Extent[]) => {
    const zone = await offlineZonesRepository.saveZone(name, extents);
    await refresh();
    return zone;
  }, [refresh]);

  const appendZoneExtent = useCallback(async (name: string, extent: Extent) => {
    const zone = await offlineZonesRepository.appendExtent(name, extent);
    await refresh();
    return zone;
  }, [refresh]);

  const deleteZone = useCallback(async (name: string) => {
    await offlineZonesRepository.deleteZone(name);
    await refresh();
  }, [refresh]);

  /**
   * Saves the pre-load cache definition created by "Ajouter des couches".
   * At this stage the cache exists logically, but no zone has been downloaded yet.
   */
  const saveCommunityCacheDraft = useCallback(
    async ({
      communityId,
      layers,
    }: OfflineCacheDraftInput): Promise<OfflineCommunityCache | null> => {
      if (activeCommunityId === communityId && !isOfflineAllowed) {
        throw new AppError({ kind: 'validation', translationKey: 'errors.global.validation', message: 'Offline mode is not allowed for the active community', retryable: false });
      }

      const existingDraftCache = await offlineCacheRepository.getCache(communityId);

      if (layers.length === 0) {
        if (existingDraftCache) {
          await offlineCacheRepository.deleteCache(communityId);
          await refresh();
        }

        return null;
      }

      const savedLayers = layers.map((layer) => ({
        layerKey: getCommunityLayerKey(layer),
        layer,
      }));
      const savedCache: OfflineCommunityCache = {
        id: `community-${communityId}`,
        communityId,
        communityName:
          activeCommunityId === communityId
            ? activeCommunity?.name
            : existingDraftCache?.communityName,
        layerKeys: savedLayers.map((layer) => layer.layerKey),
        layers: savedLayers,
        zoneNames: [],
        extents: [],
        loaded: false,
      };

      await offlineCacheRepository.saveCache(savedCache);
      await refresh();
      return savedCache;
    },
    [activeCommunity?.name, activeCommunityId, isOfflineAllowed, refresh]
  );

  /**
   * Downloads or extends one community cache.
   * The flow stays additive: new zones only fetch missing tiles, and new layers are loaded on the current cache extents.
   */
  const downloadCommunityCache = useCallback(
    async ({
      communityId,
      layers,
      zoneNames,
    }: OfflineCacheDownloadInput): Promise<OfflineCommunityCache> => {
      if (isDownloading) {
        throw new AppError({ kind: 'validation', translationKey: 'errors.global.validation', message: 'An offline download is already running', retryable: false });
      }

      if (!network.connected) {
        throw new AppError({ kind: 'network', translationKey: 'errors.global.network', message: 'A network connection is required to download offline data' });
      }

      if (activeCommunityId === communityId && !isOfflineAllowed) {
        throw new AppError({ kind: 'validation', translationKey: 'errors.global.validation', message: 'Offline mode is not allowed for the active community', retryable: false });
      }

      const existingCache = await offlineCacheRepository.getCache(communityId);

      if (!existingCache && layers.length === 0) {
        throw new AppError({ kind: 'validation', translationKey: 'errors.global.validation', message: 'At least one offline layer is required to download data', retryable: false });
      }

      const nextZoneNames = existingCache ? [...existingCache.zoneNames] : [];
      for (const zoneName of zoneNames) {
        if (!nextZoneNames.includes(zoneName)) {
          nextZoneNames.push(zoneName);
        }
      }

      const nextExtents = await offlineZonesRepository.getExtents(nextZoneNames);
      const nextUnionExtent = await offlineZonesRepository.getUnionExtent(nextZoneNames);

      if (nextExtents.length === 0 || !nextUnionExtent) {
        throw new AppError({ kind: 'validation', translationKey: 'errors.global.validation', message: 'At least one offline zone is required to download data', retryable: false });
      }

      const communityName =
        activeCommunityId === communityId
          ? activeCommunity?.name
          : existingCache?.communityName;

      const newZoneNames = existingCache ? zoneNames.filter((zoneName) => !existingCache.zoneNames.includes(zoneName)) : zoneNames;
      const newZoneExtents = newZoneNames.length === 0 ? [] : await offlineZonesRepository.getExtents(newZoneNames);
      const existingLayerKeys = existingCache?.layerKeys ?? [];
      const newLayers = layers.filter(
        (layer) => !existingLayerKeys.includes(getCommunityLayerKey(layer))
      );

      if (existingCache && newZoneExtents.length === 0 && newLayers.length === 0) {
        return existingCache;
      }

      const steps: Array<{
        layers: CommunityLayer[];
        deleteLayers: Array<{ layer: CommunityLayer; cacheNamespace?: string }>;
        extents: Extent[];
        excludedExtents?: Extent[];
        tileCount: number;
        collectSavedLayers: boolean;
      }> = [];

      if (existingCache) {
        const existingLayers = existingCache.layers.map((cacheLayer) => cacheLayer.layer);

        if (existingLayers.length > 0 && newZoneExtents.length > 0) {
          steps.push({
            layers: existingLayers,
            deleteLayers: existingCache.layers,
            extents: newZoneExtents,
            excludedExtents: existingCache.extents,
            tileCount: offlineVectorDownloadService.countTiles({
              communityId,
              layers: existingLayers,
              extents: newZoneExtents,
              excludedExtents: existingCache.extents,
            }),
            collectSavedLayers: existingCache.loaded !== true,
          });
        }

        if (newLayers.length > 0) {
          steps.push({
            layers: newLayers,
            deleteLayers: newLayers.map((layer) => ({ layer })),
            extents: nextExtents,
            tileCount: offlineVectorDownloadService.countTiles({
              communityId,
              layers: newLayers,
              extents: nextExtents,
            }),
            collectSavedLayers: true,
          });
        }
      } else {
        steps.push({
          layers,
          deleteLayers: layers.map((layer) => ({ layer })),
          extents: nextExtents,
          tileCount: offlineVectorDownloadService.countTiles({
            communityId,
            layers,
            extents: nextExtents,
          }),
          collectSavedLayers: true,
        });
      }

      const cleanupSteps: Array<{
        layers: Array<{ layer: CommunityLayer; cacheNamespace?: string }>;
        extents: Extent[];
        excludedExtents?: Extent[];
      }> = [];

      setIsDownloading(true);
      setDownloadError(null);
      setDownloadProgress(null);

      try {
        let totalTileCount = 0;
        for (const step of steps) {
          totalTileCount += step.tileCount;
        }
        let progressOffset = 0;
        const savedLayers: OfflineCacheLayer[] =
          existingCache?.loaded === true
            ? [...existingCache.layers]
            : [];

        for (const step of steps) {
          cleanupSteps.push({
            layers: step.deleteLayers,
            extents: step.extents,
            excludedExtents: step.excludedExtents,
          });

          const downloadedLayers = await offlineVectorDownloadService.downloadCache({
            communityId,
            layers: step.layers,
            extents: step.extents,
            excludedExtents: step.excludedExtents,
            onProgress: (progress) => {
              const downloadedTileCount = progressOffset + progress.downloadedTileCount;

              setDownloadProgress({
                currentLayerTitle: progress.currentLayerTitle,
                downloadedTileCount,
                totalTileCount,
                percent:
                  totalTileCount === 0
                    ? 100
                    : Math.round((downloadedTileCount / totalTileCount) * 100),
              });
            },
          });

          if (step.collectSavedLayers) {
            savedLayers.push(...downloadedLayers);
          }

          progressOffset += step.tileCount;
        }

        const now = new Date().toISOString();
        const savedCache: OfflineCommunityCache = {
          id: `community-${communityId}`,
          communityId,
          communityName,
          layerKeys: savedLayers.map((layer) => layer.layerKey),
          layers: savedLayers,
          zoneNames: nextZoneNames,
          extent: nextUnionExtent,
          extents: nextExtents,
          loaded: true,
          loadedAt: existingCache?.loadedAt ?? now,
          lastRefreshAt: now,
        };

        await offlineCacheRepository.saveCache(savedCache);
        await refresh();
        return savedCache;
      } catch (error) {
        try {
          for (const step of cleanupSteps) {
            await offlineVectorDownloadService.deleteCacheData({
              communityId,
              layers: step.layers,
              extents: step.extents,
              excludedExtents: step.excludedExtents,
            });
          }
        } catch (cleanupError) {
          console.error('[Offline] Failed to clean partial download data', cleanupError);
        }

        if (isAppError(error) && error.code === OFFLINE_DOWNLOAD_CANCELLED_CODE) {
          throw error;
        }

        const appError = toAppError(error, { fallbackKind: 'unknown', fallbackTranslationKey: 'errors.global.unknown' });
        setDownloadError(appError);
        throw appError;
      } finally {
        setIsDownloading(false);
        setDownloadProgress(null);
      }
    },
    [
      activeCommunity?.name,
      activeCommunityId,
      isDownloading,
      isOfflineAllowed,
      network.connected,
      refresh,
    ]
  );

  /**
   * Refresh currently means "delete then redownload" for the whole cache.
   * This keeps the behavior simple until an incremental refresh strategy is added.
   */
  const refreshCommunityCache = useCallback(
    async (communityId: number): Promise<OfflineCommunityCache> => {
      if (isDownloading) {
        throw new AppError({ kind: 'validation', translationKey: 'errors.global.validation', message: 'An offline download is already running', retryable: false });
      }

      if (!network.connected) {
        throw new AppError({ kind: 'network', translationKey: 'errors.global.network', message: 'A network connection is required to download offline data' });
      }

      if (activeCommunityId === communityId && !isOfflineAllowed) {
        throw new AppError({ kind: 'validation', translationKey: 'errors.global.validation', message: 'Offline mode is not allowed for the active community', retryable: false });
      }

      const offlineCache = (await offlineCacheRepository.getCache(communityId))!;

      await offlineVectorDownloadService.deleteCacheData({
        communityId,
        layers: offlineCache.layers,
        extents: offlineCache.extents,
      });
      await offlineCacheRepository.deleteCache(communityId);

      return await downloadCommunityCache({
        communityId,
        layers: offlineCache.layers.map((cacheLayer) => cacheLayer.layer),
        zoneNames: offlineCache.zoneNames,
      });
    },
    [activeCommunityId, downloadCommunityCache, isDownloading, isOfflineAllowed, network.connected]
  );

  /**
   * Refreshes one loaded layer in place on the current cache extents.
   * This keeps the rest of the cache untouched while replacing that layer's downloaded tiles.
   */
  const refreshCommunityCacheLayer = useCallback(async (communityId: number, layerKey: string): Promise<OfflineCommunityCache> => {
    if (isDownloading) {
      throw new AppError({ kind: 'validation', translationKey: 'errors.global.validation', message: 'An offline download is already running', retryable: false });
    }

    if (!network.connected) {
      throw new AppError({ kind: 'network', translationKey: 'errors.global.network', message: 'A network connection is required to download offline data' });
    }

    const offlineCache = (await offlineCacheRepository.getCache(communityId))!;
    const cacheLayer = offlineCache.layers.find((layer) => layer.layerKey === layerKey)!;

    setIsDownloading(true);
    setDownloadError(null);
    setDownloadProgress(null);

    try {
      const [refreshedLayer] = await offlineVectorDownloadService.downloadCache({
        communityId,
        layers: [cacheLayer.layer],
        extents: offlineCache.extents,
        onProgress: (progress) => {
          setDownloadProgress(progress);
        },
      });

      const nextLayers = offlineCache.layers.map((layer) =>
        layer.layerKey === layerKey ? refreshedLayer : layer
      );
      const nextCache: OfflineCommunityCache = {
        ...offlineCache,
        layerKeys: nextLayers.map((layer) => layer.layerKey),
        layers: nextLayers,
        lastRefreshAt: new Date().toISOString(),
      };

      await offlineCacheRepository.saveCache(nextCache);
      await refresh();
      return nextCache;
    } catch (error) {
      if (isAppError(error) && error.code === OFFLINE_DOWNLOAD_CANCELLED_CODE) {
        throw error;
      }

      const appError = toAppError(error, { fallbackKind: 'unknown', fallbackTranslationKey: 'errors.global.unknown' });
      setDownloadError(appError);
      throw appError;
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  },
    [isDownloading, network.connected, refresh]
  );

  const cancelOfflineDownload = useCallback(() => {
    offlineVectorDownloadService.cancel();
  }, []);

  /**
   * Removes one layer from the community cache.
   * If it was the last layer, the whole cache definition is removed as well.
   */
  const deleteCommunityCacheLayer = useCallback(async (communityId: number, layerKey: string) => {
    if (isDownloading) {
      throw new AppError({ kind: 'validation', translationKey: 'errors.global.validation', message: 'Cannot delete offline data while a download is running', retryable: false });
    }

    const offlineCache = (await offlineCacheRepository.getCache(communityId))!;
    const nextLayers = offlineCache.layers.filter((layer) => layer.layerKey !== layerKey);

    if (offlineCache.loaded) {
      const deletedLayer = offlineCache.layers.find((layer) => layer.layerKey === layerKey)!;

      await offlineVectorDownloadService.deleteCacheData({
        communityId,
        layers: [deletedLayer],
        extents: offlineCache.extents,
      });
    }

    if (nextLayers.length === 0) {
      await offlineCacheRepository.deleteCache(communityId);
      await refresh();
      return;
    }

    await offlineCacheRepository.saveCache({
      ...offlineCache,
      layerKeys: nextLayers.map((layer) => layer.layerKey),
      layers: nextLayers,
    });
    await refresh();
  }, [isDownloading, refresh]);

  /**
   * Deletes both the downloaded data and the persisted cache metadata for one community.
   */
  const deleteCommunityCache = useCallback(async (communityId: number) => {
    if (isDownloading) {
      throw new AppError({ kind: 'validation', translationKey: 'errors.global.validation', message: 'Cannot delete offline data while a download is running', retryable: false });
    }

    const offlineCache = (await offlineCacheRepository.getCache(communityId))!;

    await offlineVectorDownloadService.deleteCacheData({
      communityId,
      layers: offlineCache.layers,
      extents: offlineCache.extents,
    });
    await offlineCacheRepository.deleteCache(communityId);
    await refresh();
  }, [isDownloading, refresh]);

  const value = {
    mode,
    requestedMode,
    network,
    activeCommunityId,
    isOfflineAllowed,
    hasOfflineData,
    canEnableOffline,
    activeCommunityCache,
    zones,
    isLoading,
    isDownloading,
    downloadProgress,
    downloadError,
    caches,
    refresh,
    setOfflineMode,
    saveZone,
    appendZoneExtent,
    deleteZone,
    saveCommunityCacheDraft,
    downloadCommunityCache,
    refreshCommunityCache,
    refreshCommunityCacheLayer,
    cancelOfflineDownload,
    deleteCommunityCacheLayer,
    deleteCommunityCache,
  };

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}
