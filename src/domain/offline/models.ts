import type { ConnectionType } from '@capacitor/network';
import type { CommunityLayer } from '@ign/mobile-core';
import type { Extent } from 'ol/extent';

export type OfflineMode = 'online' | 'offline';

export interface OfflineZone {
  name: string;
  extents: Extent[];
}

export interface OfflinePackageLayer {
  layerKey: string;
  layer: CommunityLayer;
  cacheNamespace?: string;
}

export interface OfflinePackageDownloadInput {
  communityId: number;
  layers: CommunityLayer[];
  zoneNames: string[];
}

export interface OfflineDownloadProgress {
  currentLayerTitle: string;
  downloadedTileCount: number;
  totalTileCount: number;
  percent: number;
}

export interface OfflineCommunityPackage {
  id: string;
  communityId: number;
  communityName?: string;
  layerKeys: string[];
  layers: OfflinePackageLayer[];
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
  activeCommunityPackage: OfflineCommunityPackage | null;
  zones: OfflineZone[];
}
