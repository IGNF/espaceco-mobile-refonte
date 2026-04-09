import { createContext } from 'react';
import type { Extent } from 'ol/extent';
import type {
  OfflineCommunityPackage,
  OfflineDownloadProgress,
  OfflineMode,
  OfflineModeState,
  OfflinePackageDownloadInput,
  OfflineZone,
} from '@/domain/offline/models';
import type { AppError } from '@/shared/errors/appError';

export interface OfflineContextType extends OfflineModeState {
  isLoading: boolean;
  isDownloading: boolean;
  downloadProgress: OfflineDownloadProgress | null;
  downloadError: AppError | null;
  packages: OfflineCommunityPackage[];
  refresh: () => Promise<void>;
  setOfflineMode: (mode: OfflineMode) => Promise<void>;
  saveZone: (name: string, extents: Extent | Extent[]) => Promise<OfflineZone>;
  appendZoneExtent: (name: string, extent: Extent) => Promise<OfflineZone>;
  deleteZone: (name: string) => Promise<void>;
  downloadCommunityPackage: (
    input: OfflinePackageDownloadInput
  ) => Promise<OfflineCommunityPackage>;
  refreshCommunityPackage: (communityId: number) => Promise<OfflineCommunityPackage>;
  cancelOfflineDownload: () => void;
  deleteCommunityPackage: (communityId: number) => Promise<void>;
}

export const OfflineContext = createContext<OfflineContextType | null>(null);
