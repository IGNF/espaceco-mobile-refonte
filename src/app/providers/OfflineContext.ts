import { createContext } from 'react';
import type { Extent } from 'ol/extent';
import type {
  OfflineCommunityPackage,
  OfflineMode,
  OfflineModeState,
  OfflineZone,
} from '@/domain/offline/models';

export interface OfflineContextType extends OfflineModeState {
  isLoading: boolean;
  packages: OfflineCommunityPackage[];
  refresh: () => Promise<void>;
  setOfflineMode: (mode: OfflineMode) => Promise<void>;
  saveZone: (name: string, extents: Extent | Extent[]) => Promise<OfflineZone>;
  appendZoneExtent: (name: string, extent: Extent) => Promise<OfflineZone>;
  deleteZone: (name: string) => Promise<void>;
  saveCommunityPackage: (
    offlinePackage: OfflineCommunityPackage
  ) => Promise<OfflineCommunityPackage>;
  deleteCommunityPackage: (communityId: number) => Promise<void>;
}

export const OfflineContext = createContext<OfflineContextType | null>(null);
