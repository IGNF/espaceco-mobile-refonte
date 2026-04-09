import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { PluginListenerHandle } from '@capacitor/core';
import type { Extent } from 'ol/extent';
import { Network } from '@ign/mobile-device';
import {
  type OfflineCommunityPackage,
  type OfflineDownloadProgress,
  type OfflineMode,
  type OfflineNetworkStatus,
  type OfflinePackageDownloadInput,
  type OfflineZone,
} from '@/domain/offline/models';
import { useCommunity } from '@/features/community/hooks/useCommunity';
import { OfflinePackageRepository } from '@/infra/offline/OfflinePackageRepository';
import { OfflineModeRepository } from '@/infra/offline/OfflineModeRepository';
import {
  OFFLINE_DOWNLOAD_CANCELLED_CODE,
  OfflineVectorDownloadService,
} from '@/infra/offline/OfflineVectorDownloadService';
import { OfflineZonesRepository } from '@/infra/offline/OfflineZonesRepository';
import { AppError, isAppError, toAppError } from '@/shared/errors/appError';
import { OfflineContext } from './OfflineContext';

interface OfflineProviderProps {
  children: ReactNode;
}

const offlinePackageRepository = new OfflinePackageRepository();
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
  const [packages, setPackages] = useState<OfflineCommunityPackage[]>([]);

  const refresh = useCallback(async () => {
    setIsLoading(true);

    try {
      const [nextRequestedMode, nextNetworkStatus, nextZones, nextPackages] = await Promise.all([
        offlineModeRepository.getRequestedMode(),
        getNetworkStatus(),
        offlineZonesRepository.listZones(),
        offlinePackageRepository.listPackages(),
      ]);

      setRequestedModeState(nextRequestedMode);
      setNetwork(nextNetworkStatus);
      setZones(nextZones);
      setPackages(nextPackages);
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

  const activeCommunityPackage =
    activeCommunityId == null
      ? null
      : packages.find((offlinePackage) => offlinePackage.communityId === activeCommunityId) ?? null;

  const isOfflineAllowed = activeCommunity?.offline_allowed !== false;
  const hasOfflineData = activeCommunityPackage?.loaded === true;
  const canEnableOffline = isOfflineAllowed && hasOfflineData;
  const mode: OfflineMode =
    requestedMode === 'offline' && canEnableOffline ? 'offline' : 'online';

  const setOfflineMode = useCallback(
    async (nextMode: OfflineMode) => {
      if (nextMode === 'offline' && !canEnableOffline) {
        throw new AppError({
          kind: 'validation',
          translationKey: 'errors.global.validation',
          message: 'Offline mode cannot be enabled without a loaded offline package',
          retryable: false,
        });
      }

      if (nextMode === 'online' && requestedMode === 'offline' && !network.connected) {
        throw new AppError({
          kind: 'network',
          translationKey: 'errors.global.network',
          message: 'A network connection is required to switch back online',
        });
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

  const downloadCommunityPackage = useCallback(
    async ({
      communityId,
      layers,
      zoneNames,
    }: OfflinePackageDownloadInput): Promise<OfflineCommunityPackage> => {
      if (isDownloading) {
        throw new AppError({ kind: 'validation', translationKey: 'errors.global.validation', message: 'An offline download is already running', retryable: false });
      }

      if (!network.connected) {
        throw new AppError({ kind: 'network', translationKey: 'errors.global.network', message: 'A network connection is required to download offline data' });
      }

      if (activeCommunityId === communityId && !isOfflineAllowed) {
        throw new AppError({ kind: 'validation', translationKey: 'errors.global.validation', message: 'Offline mode is not allowed for the active community', retryable: false });
      }

      const extents = await offlineZonesRepository.getExtents(zoneNames);
      const unionExtent = await offlineZonesRepository.getUnionExtent(zoneNames);

      if (extents.length === 0 || !unionExtent) {
        throw new AppError({ kind: 'validation', translationKey: 'errors.global.validation', message: 'At least one offline zone is required to download data', retryable: false });
      }

      const existingPackage = await offlinePackageRepository.getPackage(communityId);
      const communityName =
        activeCommunityId === communityId
          ? activeCommunity?.name
          : existingPackage?.communityName;
      const partialPackageLayers = layers.map((layer) => ({ layer }));

      setIsDownloading(true);
      setDownloadError(null);
      setDownloadProgress(null);

      try {
        if (existingPackage) {
          await offlineVectorDownloadService.deletePackageData({
            communityId,
            layers: existingPackage.layers,
            extents: existingPackage.extents,
          });
          await offlinePackageRepository.deletePackage(communityId);
        }

        const savedLayers = await offlineVectorDownloadService.downloadPackage({
          communityId,
          layers,
          extents,
          onProgress: (progress) => {
            setDownloadProgress(progress);
          },
        });
        const now = new Date().toISOString();
        const savedPackage: OfflineCommunityPackage = {
          id: `community-${communityId}`,
          communityId,
          communityName,
          layerKeys: savedLayers.map((layer) => layer.layerKey),
          layers: savedLayers,
          zoneNames,
          extent: unionExtent,
          extents,
          loaded: true,
          loadedAt: existingPackage?.loadedAt ?? now,
          lastRefreshAt: now,
        };

        await offlinePackageRepository.savePackage(savedPackage);
        await refresh();
        return savedPackage;
      } catch (error) {
        try {
          await offlineVectorDownloadService.deletePackageData({
            communityId,
            layers: partialPackageLayers,
            extents,
          });
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

  const refreshCommunityPackage = useCallback(
    async (communityId: number): Promise<OfflineCommunityPackage> => {
      const offlinePackage = (await offlinePackageRepository.getPackage(communityId))!;

      return await downloadCommunityPackage({
        communityId,
        layers: offlinePackage.layers.map((packageLayer) => packageLayer.layer),
        zoneNames: offlinePackage.zoneNames,
      });
    },
    [downloadCommunityPackage]
  );

  const cancelOfflineDownload = useCallback(() => {
    offlineVectorDownloadService.cancel();
  }, []);

  const deleteCommunityPackage = useCallback(async (communityId: number) => {
    if (isDownloading) {
      throw new AppError({ kind: 'validation', translationKey: 'errors.global.validation', message: 'Cannot delete offline data while a download is running', retryable: false });
    }

    const offlinePackage = (await offlinePackageRepository.getPackage(communityId))!;

    await offlineVectorDownloadService.deletePackageData({
      communityId,
      layers: offlinePackage.layers,
      extents: offlinePackage.extents,
    });
    await offlinePackageRepository.deletePackage(communityId);
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
    activeCommunityPackage,
    zones,
    isLoading,
    isDownloading,
    downloadProgress,
    downloadError,
    packages,
    refresh,
    setOfflineMode,
    saveZone,
    appendZoneExtent,
    deleteZone,
    downloadCommunityPackage,
    refreshCommunityPackage,
    cancelOfflineDownload,
    deleteCommunityPackage,
  };

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}
