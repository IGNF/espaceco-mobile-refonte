import { createContext } from 'react';
import type { Community, CommunityMember } from '@ign/mobile-core';

export interface CommunityContextType {
  activeCommunity: Community | CommunityMember | null;
  communities: Community[] | CommunityMember[];
  isLoading: boolean;
  setActiveCommunity: (communityId: number) => Promise<void>;
  refreshCommunities: () => Promise<void>;
}

export const CommunityContext = createContext<CommunityContextType | null>(null);
