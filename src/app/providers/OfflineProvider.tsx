import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { PluginListenerHandle } from '@capacitor/core';
import type { CommunityLayer } from '@ign/mobile-core';
import type { Extent } from 'ol/extent';
import { boundingExtent } from 'ol/extent';
import { Network } from '@ign/mobile-device';
import {
  type OfflineCacheDownloadResult,
  type OfflineCommunityCache,
  type OfflineDownloadProgress,
  type OfflineLayerDownloadReport,
  type OfflineMode,
  type OfflineCacheDraftInput,
  type OfflineCacheDownloadInput,
  type OfflineCacheLayer,
  type OfflineRasterDownloadPreview,
  type OfflineRasterMap,
  type OfflineRasterMapDraftInput,
  type OfflineZone,
} from '@/domain/offline/models';
import type { OfflineNetworkStatus } from '@/app/providers/OfflineContext';
import { useCommunity } from '@/features/community/hooks/useCommunity';
import { OfflineCacheRepository } from '@/infra/offline/OfflineCacheRepository';
import { OfflineModeRepository } from '@/infra/offline/OfflineModeRepository';
import { OfflineRasterMapRepository } from '@/infra/offline/OfflineRasterMapRepository';
import { OfflineRasterDownloadService } from '@/infra/offline/OfflineRasterDownloadService';
import { OfflineVectorDownloadService } from '@/infra/offline/OfflineVectorDownloadService';
import { OfflineZonesRepository } from '@/infra/offline/OfflineZonesRepository';
import { EspaceCo_DeviceStorage } from '@/platform/device/storage';
import { AppError, isAppError, toAppError } from '@/shared/errors/appError';
import { getCommunityLayerTitle } from '@/shared/utils/communityLayer';
import { getCommunityLayerKey } from '@/shared/utils/layerKey';
import { OfflineContext } from './OfflineContext';
import { OFFLINE_DOWNLOAD_CANCELLED_CODE, OFFLINE_RASTER_DOWNLOAD_CANCELLED_CODE } from '@/shared/constants/offline';

interface OfflineProviderProps {
  children: ReactNode;
}

const offlineCacheRepository = new OfflineCacheRepository();
const offlineModeRepository = new OfflineModeRepository();
const offlineRasterMapRepository = new OfflineRasterMapRepository();
const offlineZonesRepository = new OfflineZonesRepository();
const offlineRasterDownloadService = new OfflineRasterDownloadService();
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

function removeOfflineCache(currentCaches: OfflineCommunityCache[], communityId: number): OfflineCommunityCache[] {
  return currentCaches.filter((cache) => cache.communityId !== communityId);
}

function removeOfflineRasterMap(currentMaps: OfflineRasterMap[], mapId: string): OfflineRasterMap[] {
  return currentMaps.filter((rasterMap) => rasterMap.id !== mapId);
}

/**
 * Replaces one cache in React state after the repository write has succeeded.
 */
function replaceOfflineCache(currentCaches: OfflineCommunityCache[], nextCache: OfflineCommunityCache): OfflineCommunityCache[] {
  return [...removeOfflineCache(currentCaches, nextCache.communityId), nextCache];
}

/**
 * Replaces one raster map in React state after the repository write has succeeded.
 */
function replaceOfflineRasterMap(currentMaps: OfflineRasterMap[], nextMap: OfflineRasterMap): OfflineRasterMap[] {
  return [...removeOfflineRasterMap(currentMaps, nextMap.id), nextMap];
}

export function OfflineProvider({ children }: OfflineProviderProps) {
  const { activeCommunity } = useCommunity();
  const activeCommunityId = activeCommunity?.id ?? null;
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCancellingDownload, setIsCancellingDownload] = useState(false);
  const [downloadProgress, setDownloadProgress] =
    useState<OfflineDownloadProgress | null>(null);
  const [downloadError, setDownloadError] = useState<AppError | null>(null);
  const [requestedMode, setRequestedModeState] = useState<OfflineMode>('online');
  const [network, setNetwork] = useState<OfflineNetworkStatus>(DEFAULT_NETWORK_STATUS);
  const [zones, setZones] = useState<OfflineZone[]>([]);
  const [caches, setCaches] = useState<OfflineCommunityCache[]>([]);
  const [rasterMaps, setRasterMaps] = useState<OfflineRasterMap[]>([]);

  /**
   * Reloads the persisted offline state used by the provider.
   * This is used for initial hydration; write operations update state directly.
   */
  const refresh = useCallback(async () => {
    setIsLoading(true);

    try {
      const [nextRequestedMode, nextNetworkStatus, nextZones, nextCaches, nextRasterMaps] = await Promise.all([
        offlineModeRepository.getRequestedMode(),
        getNetworkStatus(),
        offlineZonesRepository.listZones(),
        offlineCacheRepository.listCaches(),
        offlineRasterMapRepository.listMaps(),
      ]);

      setRequestedModeState(nextRequestedMode);
      setNetwork(nextNetworkStatus);
      setZones(nextZones);
      setCaches(nextCaches);
      setRasterMaps(nextRasterMaps);
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
  const hasOfflineData = activeCommunityCache?.loaded === true || rasterMaps.some((rasterMap) => rasterMap.loaded);
  const canEnableOffline = isOfflineAllowed && hasOfflineData;
  const mode: OfflineMode = requestedMode === 'offline' && canEnableOffline ? 'offline' : 'online';

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

    setZones((currentZones) => {
      const otherZones = currentZones.filter((currentZone) => currentZone.name !== zone.name);
      const nextZones = [...otherZones, zone];
      nextZones.sort((firstZone, secondZone) => firstZone.name.localeCompare(secondZone.name));

      return nextZones;
    });

    return zone;
  }, []);

  const appendZoneExtent = useCallback(async (name: string, extent: Extent) => {
    const zone = await offlineZonesRepository.appendExtent(name, extent);
    setZones((currentZones) =>
      currentZones.map((currentZone) =>
        currentZone.name === zone.name ? zone : currentZone
      )
    );
    return zone;
  }, []);

  const deleteZone = useCallback(async (name: string) => {
    await offlineZonesRepository.deleteZone(name);
    setZones((currentZones) => currentZones.filter((zone) => zone.name !== name));
  }, []);

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
          setCaches((currentCaches) => removeOfflineCache(currentCaches, communityId));
        }

        return null;
      }

      const savedLayers = layers.map((layer) => ({
        layerKey: getCommunityLayerKey(layer),
        layer,
      }));

      if (
        existingDraftCache &&
        existingDraftCache.loaded === false &&
        existingDraftCache.layerKeys.length === savedLayers.length &&
        existingDraftCache.layerKeys.every(
          (layerKey, index) => layerKey === savedLayers[index]?.layerKey
        )
      ) {
        return existingDraftCache;
      }

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
      setCaches((currentCaches) => replaceOfflineCache(currentCaches, savedCache));

      return savedCache;
    },
    [activeCommunity?.name, activeCommunityId, isOfflineAllowed]
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
    }: OfflineCacheDownloadInput): Promise<OfflineCacheDownloadResult> => {
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
        return {
          cache: existingCache,
          layers: [],
        };
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
      setIsCancellingDownload(false);
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
        const downloadReports: OfflineLayerDownloadReport[] = [];

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

          downloadReports.push(
            ...downloadedLayers.map((downloadedLayer) => ({
              layerKey: downloadedLayer.cacheLayer.layerKey,
              layerTitle: getCommunityLayerTitle(downloadedLayer.cacheLayer.layer),
              loadedObjectCount: downloadedLayer.loadedObjectCount,
            }))
          );

          if (step.collectSavedLayers) {
            savedLayers.push(...downloadedLayers.map((downloadedLayer) => downloadedLayer.cacheLayer));
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
        setCaches((currentCaches) => replaceOfflineCache(currentCaches, savedCache));
        return {
          cache: savedCache,
          layers: downloadReports,
        };
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
        setIsCancellingDownload(false);
        setDownloadProgress(null);
      }
    },
    [
      activeCommunity?.name,
      activeCommunityId,
      isOfflineAllowed,
      network.connected,
    ]
  );

  /**
   * Refresh currently means "delete then redownload" for the whole cache.
   * The current UI state is kept while redownloading so offline mode does not flicker.
   * If redownload fails after the repository delete, local state is cleared to match storage.
   */
  const refreshCommunityCache = useCallback(
    async (communityId: number): Promise<OfflineCacheDownloadResult> => {
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

      try {
        return await downloadCommunityCache({
          communityId,
          layers: offlineCache.layers.map((cacheLayer) => cacheLayer.layer),
          zoneNames: offlineCache.zoneNames,
        });
      } catch (error) {
        setCaches((currentCaches) => removeOfflineCache(currentCaches, communityId));
        throw error;
      }
    },
    [activeCommunityId, downloadCommunityCache, isOfflineAllowed, network.connected]
  );

  /**
   * Refreshes one loaded layer in place on the current cache extents.
   * This keeps the rest of the cache untouched while replacing that layer's downloaded tiles.
   */
  const refreshCommunityCacheLayer = useCallback(async (communityId: number, layerKey: string): Promise<OfflineCacheDownloadResult> => {
    if (!network.connected) {
      throw new AppError({ kind: 'network', translationKey: 'errors.global.network', message: 'A network connection is required to download offline data' });
    }

    const offlineCache = (await offlineCacheRepository.getCache(communityId))!;
    const cacheLayer = offlineCache.layers.find((layer) => layer.layerKey === layerKey)!;

    setIsDownloading(true);
    setIsCancellingDownload(false);
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
        layer.layerKey === layerKey ? refreshedLayer.cacheLayer : layer
      );
      const nextCache: OfflineCommunityCache = {
        ...offlineCache,
        layerKeys: nextLayers.map((layer) => layer.layerKey),
        layers: nextLayers,
        lastRefreshAt: new Date().toISOString(),
      };

      await offlineCacheRepository.saveCache(nextCache);
      setCaches((currentCaches) => replaceOfflineCache(currentCaches, nextCache));
      return {
        cache: nextCache,
        layers: [
          {
            layerKey: refreshedLayer.cacheLayer.layerKey,
            layerTitle: getCommunityLayerTitle(refreshedLayer.cacheLayer.layer),
            loadedObjectCount: refreshedLayer.loadedObjectCount,
          },
        ],
      };
    } catch (error) {
      if (isAppError(error) && error.code === OFFLINE_DOWNLOAD_CANCELLED_CODE) {
        throw error;
      }

      const appError = toAppError(error, { fallbackKind: 'unknown', fallbackTranslationKey: 'errors.global.unknown' });
      setDownloadError(appError);
      throw appError;
    } finally {
      setIsDownloading(false);
      setIsCancellingDownload(false);
      setDownloadProgress(null);
    }
  },
    [network.connected]
  );

  /**
   * Saves the metadata of one offline raster map before any tiles are downloaded.
   */
  const saveOfflineRasterMapDraft = useCallback(
    async ({
      name,
      layerName,
      minZoom,
      maxZoom,
    }: OfflineRasterMapDraftInput): Promise<OfflineRasterMap> => {
      const savedRasterMap: OfflineRasterMap = {
        id: crypto.randomUUID(),
        name,
        layerName,
        minZoom,
        maxZoom,
        zoneNames: [],
        extents: [],
        visible: true,
        loaded: false,
      };

      await offlineRasterMapRepository.saveMap(savedRasterMap);
      setRasterMaps((currentMaps) => replaceOfflineRasterMap(currentMaps, savedRasterMap));
      return savedRasterMap;
    },
    []
  );

  /**
   * Builds the user-facing preview shown before launching a raster download,
   * including the current free disk space when the native plugin can provide it.
   */
  const previewOfflineRasterMapDownload = useCallback(
    async (offlineRasterMap: OfflineRasterMap, zoneName: string): Promise<OfflineRasterDownloadPreview> => {
      if (!network.connected) {
        throw new AppError({ kind: 'network', translationKey: 'errors.global.network', message: 'A network connection is required to estimate offline data' });
      }

      const nextZoneNames = offlineRasterMap.zoneNames.includes(zoneName) ? offlineRasterMap.zoneNames : [...offlineRasterMap.zoneNames, zoneName];
      const nextExtents = await offlineZonesRepository.getExtents(nextZoneNames);
      const [preview, freeDiskSpaceMb] = await Promise.all([
        offlineRasterDownloadService.estimateDownload({
          rasterMap: offlineRasterMap,
          extents: nextExtents,
          excludedExtents: offlineRasterMap.loaded ? offlineRasterMap.extents : undefined,
        }),
        EspaceCo_DeviceStorage.getFreeDiskSpaceMb(),
      ]);

      return {
        ...preview,
        freeDiskSpaceMb,
      };
    },
    [network.connected]
  );

  /**
   * Downloads one raster map for one selected zone.
   * If the map already exists, the zone is added incrementally to the downloaded raster tiles.
   */
  const downloadOfflineRasterMap = useCallback(
    async (mapId: string, zoneName: string): Promise<OfflineRasterMap> => {
      if (!network.connected) {
        throw new AppError({ kind: 'network', translationKey: 'errors.global.network', message: 'A network connection is required to download offline data' });
      }

      const offlineRasterMap = (await offlineRasterMapRepository.getMap(mapId))!;
      const nextZoneNames = offlineRasterMap.zoneNames.includes(zoneName) ? offlineRasterMap.zoneNames : [...offlineRasterMap.zoneNames, zoneName];
      const nextExtents = await offlineZonesRepository.getExtents(nextZoneNames);
      const nextUnionExtent = await offlineZonesRepository.getUnionExtent(nextZoneNames);

      if (nextExtents.length === 0 || !nextUnionExtent) {
        throw new AppError({ kind: 'validation', translationKey: 'errors.global.validation', message: 'At least one offline zone is required to download data', retryable: false });
      }

      const excludedExtents = offlineRasterMap.loaded ? offlineRasterMap.extents : undefined;
      const totalTileCount = offlineRasterDownloadService.countTiles({
        rasterMap: offlineRasterMap,
        extents: nextExtents,
        excludedExtents,
      });

      setIsDownloading(true);
      setIsCancellingDownload(false);
      setDownloadError(null);
      setDownloadProgress(null);

      try {
        await offlineRasterDownloadService.downloadMap({
          rasterMap: offlineRasterMap,
          extents: nextExtents,
          excludedExtents,
          onProgress: (progress) => {
            setDownloadProgress(progress);
          },
        });

        const now = new Date().toISOString();
        const savedRasterMap: OfflineRasterMap = {
          ...offlineRasterMap,
          zoneNames: nextZoneNames,
          extent: nextUnionExtent,
          extents: nextExtents,
          loaded: true,
          loadedAt: offlineRasterMap.loadedAt ?? now,
          lastRefreshAt: now,
          visible: offlineRasterMap.visible,
        };

        if (totalTileCount === 0) {
          setDownloadProgress({
            currentLayerTitle: offlineRasterMap.name,
            downloadedTileCount: 0,
            totalTileCount: 0,
            percent: 100,
          });
        }

        await offlineRasterMapRepository.saveMap(savedRasterMap);
        setRasterMaps((currentMaps) => replaceOfflineRasterMap(currentMaps, savedRasterMap));
        return savedRasterMap;
      } catch (error) {
        if (isAppError(error) && error.code === OFFLINE_RASTER_DOWNLOAD_CANCELLED_CODE) {
          throw error;
        }

        const appError = toAppError(error, { fallbackKind: 'unknown', fallbackTranslationKey: 'errors.global.unknown' });
        setDownloadError(appError);
        throw appError;
      } finally {
        setIsDownloading(false);
        setIsCancellingDownload(false);
        setDownloadProgress(null);
      }
    },
    [network.connected]
  );

  /**
   * Redownloads the current extents of one raster offline map in place.
   */
  const refreshOfflineRasterMap = useCallback(
    async (mapId: string): Promise<OfflineRasterMap> => {
      if (!network.connected) {
        throw new AppError({ kind: 'network', translationKey: 'errors.global.network', message: 'A network connection is required to download offline data' });
      }

      const offlineRasterMap = (await offlineRasterMapRepository.getMap(mapId))!;

      setIsDownloading(true);
      setIsCancellingDownload(false);
      setDownloadError(null);
      setDownloadProgress(null);

      try {
        await offlineRasterDownloadService.downloadMap({
          rasterMap: offlineRasterMap,
          extents: offlineRasterMap.extents,
          onProgress: (progress) => {
            setDownloadProgress(progress);
          },
        });

        const nextRasterMap: OfflineRasterMap = {
          ...offlineRasterMap,
          extent: offlineRasterMap.extent ?? boundingExtent(offlineRasterMap.extents),
          lastRefreshAt: new Date().toISOString(),
        };

        await offlineRasterMapRepository.saveMap(nextRasterMap);
        setRasterMaps((currentMaps) => replaceOfflineRasterMap(currentMaps, nextRasterMap));
        return nextRasterMap;
      } catch (error) {
        if (isAppError(error) && error.code === OFFLINE_RASTER_DOWNLOAD_CANCELLED_CODE) {
          throw error;
        }

        const appError = toAppError(error, { fallbackKind: 'unknown', fallbackTranslationKey: 'errors.global.unknown' });
        setDownloadError(appError);
        throw appError;
      } finally {
        setIsDownloading(false);
        setIsCancellingDownload(false);
        setDownloadProgress(null);
      }
    },
    [network.connected]
  );

  const setOfflineRasterMapVisibility = useCallback(
    async (mapId: string, visible: boolean): Promise<void> => {
      const offlineRasterMap = (await offlineRasterMapRepository.getMap(mapId))!;

      await offlineRasterMapRepository.saveMap({
        ...offlineRasterMap,
        visible,
      });
      setRasterMaps((currentMaps) =>
        currentMaps.map((rasterMap) =>
          rasterMap.id === mapId ? { ...rasterMap, visible } : rasterMap
        )
      );
    },
    []
  );

  /**
   * Requests cancellation on both download services.
   * Services still decide when the current network/storage operation can stop safely.
   */
  const cancelOfflineDownload = useCallback(() => {
    setIsCancellingDownload(true);
    offlineRasterDownloadService.cancel();
    offlineVectorDownloadService.cancel();
  }, []);

  /**
   * Removes one layer from the community cache.
   * If it was the last layer, the whole cache definition is removed as well.
   */
  const deleteCommunityCacheLayer = useCallback(async (communityId: number, layerKey: string) => {
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
      setCaches((currentCaches) => removeOfflineCache(currentCaches, communityId));
      return;
    }

    const nextCache: OfflineCommunityCache = {
      ...offlineCache,
      layerKeys: nextLayers.map((layer) => layer.layerKey),
      layers: nextLayers,
    };

    await offlineCacheRepository.saveCache(nextCache);
    setCaches((currentCaches) => replaceOfflineCache(currentCaches, nextCache));
  }, []);

  /**
   * Deletes both the downloaded data and the persisted cache metadata for one community.
   */
  const deleteCommunityCache = useCallback(async (communityId: number) => {
    const offlineCache = (await offlineCacheRepository.getCache(communityId))!;

    await offlineVectorDownloadService.deleteCacheData({
      communityId,
      layers: offlineCache.layers,
      extents: offlineCache.extents,
    });
    await offlineCacheRepository.deleteCache(communityId);
    setCaches((currentCaches) => removeOfflineCache(currentCaches, communityId));
  }, []);

  /**
   * Deletes one raster map definition and all its downloaded tiles.
   */
  const deleteOfflineRasterMap = useCallback(async (mapId: string) => {
    await offlineRasterDownloadService.deleteMapData(mapId);
    await offlineRasterMapRepository.deleteMap(mapId);
    setRasterMaps((currentMaps) => removeOfflineRasterMap(currentMaps, mapId));
  }, []);

  const value = {
    mode,
    requestedMode,
    network,
    activeCommunityId,
    isOfflineAllowed,
    hasOfflineData,
    canEnableOffline,
    activeCommunityCache,
    rasterMaps,
    zones,
    isLoading,
    isDownloading,
    isCancellingDownload,
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
    saveOfflineRasterMapDraft,
    previewOfflineRasterMapDownload,
    downloadOfflineRasterMap,
    refreshOfflineRasterMap,
    setOfflineRasterMapVisibility,
    cancelOfflineDownload,
    deleteCommunityCacheLayer,
    deleteCommunityCache,
    deleteOfflineRasterMap,
  };

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}
