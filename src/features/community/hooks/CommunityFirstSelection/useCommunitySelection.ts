/**
 * useCommunitySelection Hook
 *
 * Provides community selection functionality for the first-time selection flow.
 * Uses the CommunityContext for state management and persistence.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Community, CommunityMember } from '@ign/mobile-core';
import { useCommunity } from '@/features/community/hooks/useCommunity';
import { useAuth } from '@/features/auth/hooks/useAuth';

interface UseCommunitySelectionResult {
  activeCommunity: Community | null;
  communities: Community[];
  activeCommunities: CommunityMember[];
  selectedCommunityId: number | null;
  isLoading: boolean;
  error: string | null;
  selectCommunity: (communityId: number) => void;
  confirmSelection: () => Promise<void>;
  isConfirming: boolean;
}

export function useCommunitySelection(): UseCommunitySelectionResult {
  const {
    activeCommunity,
    communities: contextCommunities,
    setActiveCommunity,
    isLoading: contextLoading
  } = useCommunity();

  const { user } = useAuth();

  const activeCommunities = useMemo(
    () => user?.communities_member?.filter((m: CommunityMember) => m.role !== 'pending') ?? [],
    [user?.communities_member]
  );

  const [selectedCommunityId, setSelectedCommunityId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (contextLoading) return;

    setSelectedCommunityId(activeCommunity?.id ?? contextCommunities[0]?.id ?? null);
  }, [contextLoading, contextCommunities, activeCommunity]);

  // Select a community (in-memory, not persisted yet)
  const selectCommunity = useCallback((communityId: number) => {
    console.log('selectCommunity => communityId', communityId);
    setSelectedCommunityId(communityId);
  }, []);

  // Confirm and persist the selection via context
  const confirmSelection = useCallback(async () => {
    if (selectedCommunityId === null) {
      throw new Error('No community selected');
    }

    setIsConfirming(true);
    setError(null);

    try {
      await setActiveCommunity(selectedCommunityId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save community selection');
      throw err;
    } finally {
      setIsConfirming(false);
    }
  }, [selectedCommunityId, setActiveCommunity]);

  return {
    activeCommunity,
    communities: contextCommunities,
    activeCommunities,
    selectedCommunityId,
    isLoading: contextLoading,
    error,
    selectCommunity,
    confirmSelection,
    isConfirming,
  };
}
