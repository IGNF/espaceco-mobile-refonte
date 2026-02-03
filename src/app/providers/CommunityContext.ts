import { createContext } from 'react';
import type { AppCommunity } from '@/domain/community/models';

export interface CommunityContextType {
  activeCommunity: AppCommunity | null;
  communities: AppCommunity[];
  isLoading: boolean;
  setActiveCommunity: (communityId: number) => Promise<void>;
  refreshCommunities: () => Promise<void>;
}

export const CommunityContext = createContext<CommunityContextType | null>(null);
