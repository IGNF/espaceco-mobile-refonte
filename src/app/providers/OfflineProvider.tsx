import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { PluginListenerHandle } from '@capacitor/core';
import type { Extent } from 'ol/extent';
import { Network } from '@ign/mobile-device';
import {
  type OfflineCommunityPackage,
  type OfflineMode,
  type OfflineNetworkStatus,
  type OfflineZone,
} from '@/domain/offline/models';
import { useCommunity } from '@/features/community/hooks/useCommunity';
import { OfflinePackageRepository } from '@/infra/offline/OfflinePackageRepository';
import { OfflineModeRepository } from '@/infra/offline/OfflineModeRepository';
import { OfflineZonesRepository } from '@/infra/offline/OfflineZonesRepository';
import { AppError } from '@/shared/errors/appError';
import { OfflineContext } from './OfflineContext';

interface OfflineProviderProps {
  children: ReactNode;
}

const offlinePackageRepository = new OfflinePackageRepository();
const offlineModeRepository = new OfflineModeRepository();
const offlineZonesRepository = new OfflineZonesRepository();

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

  const saveCommunityPackage = useCallback(
    async (offlinePackage: OfflineCommunityPackage) => {
      const savedPackage = await offlinePackageRepository.savePackage(offlinePackage);
      await refresh();
      return savedPackage;
    },
    [refresh]
  );

  const deleteCommunityPackage = useCallback(async (communityId: number) => {
    await offlinePackageRepository.deletePackage(communityId);
    await refresh();
  }, [refresh]);

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
    packages,
    refresh,
    setOfflineMode,
    saveZone,
    appendZoneExtent,
    deleteZone,
    saveCommunityPackage,
    deleteCommunityPackage,
  };

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}
