import { useMemo } from "react";

import type { CommunityMember } from "@ign/mobile-core";

import { useAuth } from "@/features/auth/hooks/useAuth";

export function useCommunityMembership() {
  const { user } = useAuth();

  const activeMemberCommunityIds = useMemo(
    () => new Set(
      user?.communities_member
        ?.filter((member: CommunityMember) => member.role !== "pending")
        .map((member: CommunityMember) => member.community_id) ?? []
    ),
    [user?.communities_member]
  );

  const pendingMemberCommunityIds = useMemo(
    () => new Set(
      user?.communities_member
        ?.filter((member: CommunityMember) => member.role === "pending")
        .map((member: CommunityMember) => member.community_id) ?? []
    ),
    [user?.communities_member]
  );

  return {
    activeMemberCommunityIds,
    pendingMemberCommunityIds,
  };
}
