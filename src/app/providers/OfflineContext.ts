import { createContext } from 'react';
import type { Extent } from 'ol/extent';
import type {
  OfflineCommunityCache,
  OfflineDownloadProgress,
  OfflineMode,
  OfflineCacheDraftInput,
  OfflineRasterMap,
  OfflineRasterMapDraftInput,
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
  rasterMaps: OfflineRasterMap[];
  refresh: () => Promise<void>;
  setOfflineMode: (mode: OfflineMode) => Promise<void>;
  saveZone: (name: string, extents: Extent | Extent[]) => Promise<OfflineZone>;
  appendZoneExtent: (name: string, extent: Extent) => Promise<OfflineZone>;
  deleteZone: (name: string) => Promise<void>;
  saveCommunityCacheDraft: (input: OfflineCacheDraftInput) => Promise<OfflineCommunityCache | null>;
  downloadCommunityCache: (input: OfflineCacheDownloadInput) => Promise<OfflineCommunityCache>;
  refreshCommunityCache: (communityId: number) => Promise<OfflineCommunityCache>;
  refreshCommunityCacheLayer: (communityId: number, layerKey: string) => Promise<OfflineCommunityCache>;
  saveOfflineRasterMapDraft: (input: OfflineRasterMapDraftInput) => Promise<OfflineRasterMap>;
  downloadOfflineRasterMap: (mapId: string, zoneName: string) => Promise<OfflineRasterMap>;
  refreshOfflineRasterMap: (mapId: string) => Promise<OfflineRasterMap>;
  setOfflineRasterMapVisibility: (mapId: string, visible: boolean) => Promise<void>;
  cancelOfflineDownload: () => void;
  deleteCommunityCacheLayer: (communityId: number, layerKey: string) => Promise<void>;
  deleteCommunityCache: (communityId: number) => Promise<void>;
  deleteOfflineRasterMap: (mapId: string) => Promise<void>;
}

export const OfflineContext = createContext<OfflineContextType | null>(null);
