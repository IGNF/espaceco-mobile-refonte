import { createContext } from 'react';
import type { Community } from '@ign/mobile-core';

export interface CommunityContextType {
  activeCommunity: Community | null;
  communities: Community[];
  isLoading: boolean;
  setActiveCommunity: (communityId: number) => Promise<void>;
  refreshCommunities: () => Promise<void>;
}

export const CommunityContext = createContext<CommunityContextType | null>(null);
