import { useState } from "react";
import { useCommunity } from "@/features/community/hooks/useCommunity";

export function useMyCommunities() {
  const { activeCommunity, communities, isLoading } = useCommunity();
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
    selectedCommunityId,
    isLoading,
    selectCommunity,
    resetSelection,
  };
}
