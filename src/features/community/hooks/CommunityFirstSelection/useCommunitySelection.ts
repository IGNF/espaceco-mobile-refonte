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
import type { AppVariantConfig } from '@/shared/config/appVariant';

interface UseCommunitySelectionResult {
  activeCommunity: Community | null;
  communities: Community[];
  activeCommunities: CommunityMember[];
  selectedCommunityId: number | null;
  isLoading: boolean;
  error: string | null;
  appVariant: AppVariantConfig;
  fixedCommunityId: number | null;
  canSwitchCommunity: boolean;
  hasRequiredCommunityAccess: boolean;
  selectCommunity: (communityId: number) => void;
  confirmSelection: () => Promise<void>;
  isConfirming: boolean;
}

export function useCommunitySelection(): UseCommunitySelectionResult {
  const {
    activeCommunity,
    communities: contextCommunities,
    appVariant,
    fixedCommunityId,
    canSwitchCommunity,
    hasRequiredCommunityAccess,
    setActiveCommunity,
    isLoading: contextLoading
  } = useCommunity();

  const { user } = useAuth();

  const activeCommunities = useMemo(
    () => {
      const memberships = user?.communities_member?.filter((m: CommunityMember) => m.role !== 'pending') ?? [];
      return fixedCommunityId === null
        ? memberships
        : memberships.filter((membership: CommunityMember) => membership.community_id === fixedCommunityId);
    },
    [fixedCommunityId, user?.communities_member]
  );

  const [selectedCommunityId, setSelectedCommunityId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (contextLoading) return;

    setSelectedCommunityId(fixedCommunityId ?? activeCommunity?.id ?? contextCommunities[0]?.id ?? null);
  }, [contextLoading, fixedCommunityId, contextCommunities, activeCommunity]);

  // Select a community (in-memory, not persisted yet)
  const selectCommunity = useCallback((communityId: number) => {
    if (fixedCommunityId !== null) return;

    console.log('selectCommunity => communityId', communityId);
    setSelectedCommunityId(communityId);
  }, [fixedCommunityId]);

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
    appVariant,
    fixedCommunityId,
    canSwitchCommunity,
    hasRequiredCommunityAccess,
    selectCommunity,
    confirmSelection,
    isConfirming,
  };
}
