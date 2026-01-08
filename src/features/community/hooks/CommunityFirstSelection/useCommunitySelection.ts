/**
 * useCommunitySelection Hook
 *
 * Provides community selection functionality:
 * - Fetch communities from API or use cached from user context
 * - Select and persist active community
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Community } from '@ign/mobile-core';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { fetchCommunities } from '@/infra/community/communityApi';
import { UserStorageAdapter } from '@/infra/storage';

interface UseCommunitySelectionResult {
  communities: Community[];
  selectedCommunityId: number | null;
  isLoading: boolean;
  error: string | null;
  selectCommunity: (communityId: number) => void;
  confirmSelection: () => Promise<void>;
  isConfirming: boolean;
}

// Singleton instance of the storage adapter
const userStorage = new UserStorageAdapter();

export function useCommunitySelection(): UseCommunitySelectionResult {
  const { user } = useAuth();

  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  // Load communities on mount
  useEffect(() => {
    async function loadCommunities() {
      setIsLoading(true);
      setError(null);

      try {

        /**
         * Plug API instead of mock data
         */
        const mockCommunities: Community[] = [
          {
            id: 1,
            name: 'Groupe 1',
            description: 'Description 1',
          },
          {
            id: 2,
            name: 'Groupe 2',
            description: 'Description 2',
          },
        ];

        setCommunities(mockCommunities);
        setSelectedCommunityId(mockCommunities[0].id);

        // First, try to get communities from user context (already loaded at login)
        // if (user?.communities && user.communities.length > 0) {
        //   setCommunities(user.communities);
        // } else if (user?.id) {
        //   // Fallback: fetch from API if not in user context
        //   const fetchedCommunities = await fetchCommunities({ userId: user.id });
        //   setCommunities(fetchedCommunities);
        // }

        // // Load previously selected community
        // const activeCommunityId = await userStorage.getActiveCommunity();
        // if (activeCommunityId !== null) {
        //   setSelectedCommunityId(activeCommunityId);
        // }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load communities');
      } finally {
        setIsLoading(false);
      }
    }

    loadCommunities();
  }, [user]);

  // Select a community (in-memory, not persisted yet)
  const selectCommunity = useCallback((communityId: number) => {
    setSelectedCommunityId(communityId);
  }, []);

  // Confirm and persist the selection
  const confirmSelection = useCallback(async () => {
    if (selectedCommunityId === null) {
      throw new Error('No community selected');
    }

    setIsConfirming(true);
    setError(null);

    try {
      await userStorage.setActiveCommunity(selectedCommunityId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save community selection');
      throw err;
    } finally {
      setIsConfirming(false);
    }
  }, [selectedCommunityId]);

  // Get the selected community object
  // const selectedCommunity = useMemo(() => {
  //   if (selectedCommunityId === null) return null;
  //   return communities.find(c => c.id === selectedCommunityId) ?? null;
  // }, [communities, selectedCommunityId]);

  return {
    communities,
    selectedCommunityId,
    isLoading,
    error,
    selectCommunity,
    confirmSelection,
    isConfirming,
  };
}
