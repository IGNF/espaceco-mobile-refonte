import { createContext } from 'react';
import type { Extent } from 'ol/extent';
import type {
  OfflineCommunityCache,
  OfflineDownloadProgress,
  OfflineMode,
  OfflineCacheDraftInput,
  OfflineModeState,
  OfflineCacheDownloadInput,
  OfflineZone,
} from '@/domain/offline/models';
import type { AppError } from '@/shared/errors/appError';

export interface OfflineContextType extends OfflineModeState {
  isLoading: boolean;
  isDownloading: boolean;
  downloadProgress: OfflineDownloadProgress | null;
  downloadError: AppError | null;
  caches: OfflineCommunityCache[];
  refresh: () => Promise<void>;
  setOfflineMode: (mode: OfflineMode) => Promise<void>;
  saveZone: (name: string, extents: Extent | Extent[]) => Promise<OfflineZone>;
  appendZoneExtent: (name: string, extent: Extent) => Promise<OfflineZone>;
  deleteZone: (name: string) => Promise<void>;
  saveCommunityCacheDraft: (input: OfflineCacheDraftInput) => Promise<OfflineCommunityCache | null>;
  downloadCommunityCache: (input: OfflineCacheDownloadInput) => Promise<OfflineCommunityCache>;
  refreshCommunityCache: (communityId: number) => Promise<OfflineCommunityCache>;
  refreshCommunityCacheLayer: (communityId: number, layerKey: string) => Promise<OfflineCommunityCache>;
  cancelOfflineDownload: () => void;
  deleteCommunityCacheLayer: (communityId: number, layerKey: string) => Promise<void>;
  deleteCommunityCache: (communityId: number) => Promise<void>;
}

export const OfflineContext = createContext<OfflineContextType | null>(null);
