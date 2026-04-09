import type { ConnectionType } from '@capacitor/network';
import type { CommunityLayer } from '@ign/mobile-core';
import type { Extent } from 'ol/extent';

export type OfflineMode = 'online' | 'offline';

export interface OfflineZone {
  name: string;
  extents: Extent[];
}

export interface OfflineCacheLayer {
  layerKey: string;
  layer: CommunityLayer;
  cacheNamespace?: string;
}

export interface OfflineCacheDownloadInput {
  communityId: number;
  layers: CommunityLayer[];
  zoneNames: string[];
}

export interface OfflineCacheDraftInput {
  communityId: number;
  layers: CommunityLayer[];
}

export interface OfflineDownloadProgress {
  currentLayerTitle: string;
  downloadedTileCount: number;
  totalTileCount: number;
  percent: number;
}

export interface OfflineCommunityCache {
  id: string;
  communityId: number;
  communityName?: string;
  layerKeys: string[];
  layers: OfflineCacheLayer[];
  zoneNames: string[];
  extent?: Extent;
  extents: Extent[];
  loaded: boolean;
  loadedAt?: string;
  lastRefreshAt?: string;
}

export interface OfflineNetworkStatus {
  connected: boolean;
  connectionType: ConnectionType;
}

export interface OfflineModeState {
  mode: OfflineMode;
  requestedMode: OfflineMode;
  network: OfflineNetworkStatus;
  activeCommunityId: number | null;
  isOfflineAllowed: boolean;
  hasOfflineData: boolean;
  canEnableOffline: boolean;
  activeCommunityCache: OfflineCommunityCache | null;
  zones: OfflineZone[];
}
