/**
 * useCommunitySelection Hook
 *
 * Provides community selection functionality for the first-time selection flow.
 * Uses the CommunityContext for state management and persistence.
 */
import { useState, useEffect, useCallback } from 'react';
import type { Community } from '@ign/mobile-core';
import { useCommunity } from '@/features/community/hooks/useCommunity';

interface UseCommunitySelectionResult {
  communities: Community[];
  selectedCommunityId: number | null;
  isLoading: boolean;
  error: string | null;
  selectCommunity: (communityId: number) => void;
  confirmSelection: () => Promise<void>;
  isConfirming: boolean;
}

export function useCommunitySelection(): UseCommunitySelectionResult {
  const {
    communities: contextCommunities,
    setActiveCommunity,
    isLoading: contextLoading
  } = useCommunity();

  const [selectedCommunityId, setSelectedCommunityId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (contextLoading) return;

    setSelectedCommunityId(contextCommunities[0]?.id ?? null);
  }, [contextLoading, contextCommunities]);

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
    communities: contextCommunities,
    selectedCommunityId,
    isLoading: contextLoading,
    error,
    selectCommunity,
    confirmSelection,
    isConfirming,
  };
}
