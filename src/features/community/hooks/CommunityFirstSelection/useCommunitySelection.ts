/**
 * useCommunitySelection Hook
 *
 * Provides community selection functionality for the first-time selection flow.
 * Uses the CommunityContext for state management and persistence.
 *
 * - Fetches communities from API (or uses mock data for now)
 * - Manages local selection state before confirmation
 * - Persists selection via CommunityContext
 */
import { useState, useEffect, useCallback } from 'react';
import type { Community, CommunityMember } from '@ign/mobile-core';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCommunity } from '@/features/community/hooks/useCommunity';
import { UserStorageAdapter } from '@/infra/storage';

import { collabApiClient } from "@/infra/api/collabApiClient";

interface UseCommunitySelectionResult {
  communities: Community[] | CommunityMember[];
  selectedCommunityId: number | null;
  isLoading: boolean;
  error: string | null;
  selectCommunity: (communityId: number) => void;
  confirmSelection: () => Promise<void>;
  isConfirming: boolean;
}

// Storage adapter for saving communities (until they're loaded via API at login)
const userStorage = new UserStorageAdapter();

export function useCommunitySelection(): UseCommunitySelectionResult {
  const { user } = useAuth();
  const {
    communities: contextCommunities,
    activeCommunity,
    setActiveCommunity,
    refreshCommunities,
    isLoading: contextLoading
  } = useCommunity();

  // Local state for the selection flow
  const [communities, setCommunities] = useState<Community[] | CommunityMember[]>([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  // Load communities on mount
  useEffect(() => {
    async function loadCommunities() {
      console.log('loadCommunities', user);
      console.log('contextCommunities', contextCommunities);
      setIsLoading(true);
      setError(null);

      try {
        // First check if communities are already in context (loaded from storage)
        if (contextCommunities.length > 0) {
          setCommunities(contextCommunities);
          // Pre-select the active community if exists, otherwise first one

          if ('community_id' in contextCommunities[0]) {
            setSelectedCommunityId(contextCommunities[0].community_id);
          } else {
            setSelectedCommunityId(contextCommunities[0].id);
          }
          setIsLoading(false);
          return;
        }

        const allCommunities = (await collabApiClient.community.getAll()).data as Community[];
        console.log('allCommunities', allCommunities);



        // Save communities to storage so CommunityContext can access them
        await userStorage.saveCommunities(allCommunities || []);
        await refreshCommunities();

        setCommunities(allCommunities || []);
        setSelectedCommunityId(allCommunities?.[0]?.id || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load communities');
      } finally {
        setIsLoading(false);
      }
    }

    // Wait for context to finish loading before deciding what to do
    if (!contextLoading) {
      loadCommunities();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextLoading]);

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
    communities,
    selectedCommunityId,
    isLoading: isLoading || contextLoading,
    error,
    selectCommunity,
    confirmSelection,
    isConfirming,
  };
}
