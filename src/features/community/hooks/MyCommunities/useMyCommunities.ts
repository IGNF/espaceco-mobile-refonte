import { useState, useMemo } from "react";
import type { CommunityMember } from "@ign/mobile-core";
import { useCommunity } from "@/features/community/hooks/useCommunity";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function useMyCommunities() {
  const { activeCommunity, communities, isLoading } = useCommunity();
  const { user } = useAuth();
  const [selectedCommunityIdState, setSelectedCommunityId] = useState<number | null>(null);
  const selectedCommunityId = selectedCommunityIdState ?? activeCommunity?.id ?? communities[0]?.id ?? null;

  const activeMemberCommunityIds = useMemo(
    () => new Set(
      user?.communities_member
        ?.filter((m: CommunityMember) => m.role !== 'pending')
        .map((m: CommunityMember) => m.community_id) ?? []
    ),
    [user?.communities_member]
  );

  const selectCommunity = (communityId: number) => {
    setSelectedCommunityId(communityId);
  };

  const resetSelection = () => {
    setSelectedCommunityId(null);
  };

  return {
    activeCommunity,
    communities,
    activeMemberCommunityIds,
    selectedCommunityId,
    isLoading,
    selectCommunity,
    resetSelection,
  };
}
