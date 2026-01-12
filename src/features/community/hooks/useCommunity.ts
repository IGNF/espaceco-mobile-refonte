import { useContext } from 'react';
import { CommunityContext, type CommunityContextType } from '@/app/providers/CommunityContext';

export function useCommunity(): CommunityContextType {
  const context = useContext(CommunityContext);

  if (!context) {
    throw new Error('useCommunity must be used within a CommunityProvider');
  }

  return context;
}
