import { useState } from "react";

import { useCommunity } from "@/features/community/hooks/useCommunity";
import { useCommunityMembership } from "@/features/community/hooks/useCommunityMembership";

export function useMyCommunities() {
  const {
    activeCommunity,
    communities,
    isLoading,
    appVariant,
    canSwitchCommunity,
    hasRequiredCommunityAccess,
  } = useCommunity();
  const { activeMemberCommunityIds } = useCommunityMembership();
  const [selectedCommunityIdState, setSelectedCommunityId] = useState<number | null>(null);
  const selectedCommunityId = selectedCommunityIdState ?? activeCommunity?.id ?? communities[0]?.id ?? null;

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
    appVariant,
    canSwitchCommunity,
    hasRequiredCommunityAccess,
    selectedCommunityId,
    isLoading,
    selectCommunity,
    resetSelection,
  };
}
