import { createContext } from 'react';
import type { AppCommunity } from '@/domain/community/models';
import type { AppVariantConfig } from '@/shared/config/appVariant';

export interface CommunityContextType {
  activeCommunity: AppCommunity | null;
  communities: AppCommunity[];
  isLoading: boolean;
  appVariant: AppVariantConfig;
  fixedCommunityId: number | null;
  canSwitchCommunity: boolean;
  hasRequiredCommunityAccess: boolean;
  setActiveCommunity: (communityId: number) => Promise<void>;
  refreshCommunities: () => Promise<void>;
}

export const CommunityContext = createContext<CommunityContextType | null>(null);
