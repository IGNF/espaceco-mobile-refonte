import { useCallback, useState } from 'react';

import { EspaceCo_DeviceStorage } from '@/platform/device/storage';
import { cacheStorage } from '@/infra/storage/cacheStorage';
import { ReportStorageAdapter } from '@/infra/storage/ReportStorageAdapter';

export interface MaintenanceStats {
  rasterCacheSizeBytes: number;
  vectorCacheSizeBytes: number;
  freeDiskSpaceMb: number | null;
  reportCount: number;
  reportFileCount: number;
  reportSizeBytes: number;
}

const reportStorage = new ReportStorageAdapter();

export function useMaintenanceStats() {
  const [stats, setStats] = useState<MaintenanceStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadStats = useCallback(async () => {
    setIsLoading(true);

    try {
      const [
        rasterCacheSizeBytes,
        vectorCacheSizeBytes,
        freeDiskSpaceMb,
        reportSummary,
      ] = await Promise.all([
        cacheStorage.getRasterCacheUsedSpace(),
        cacheStorage.getVectorCacheUsedSpace(),
        EspaceCo_DeviceStorage.getFreeDiskSpaceMb(),
        reportStorage.getStorageSummary(),
      ]);

      setStats({
        rasterCacheSizeBytes,
        vectorCacheSizeBytes,
        freeDiskSpaceMb,
        reportCount: reportSummary.reportCount,
        reportFileCount: reportSummary.fileCount,
        reportSizeBytes: reportSummary.sizeBytes,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    stats,
    isLoading,
    loadStats,
  };
}
