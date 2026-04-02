import { useCallback, useState } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { collabApiClient } from "@/infra/api";
import type { AppCommunity } from "@/domain/community/models";

type JoinCommunityStatus = "joined" | "pending";

interface MemberResponse {
  role?: string;
}

interface UseJoinCommunityResult {
  joinCommunity: (community: AppCommunity) => Promise<JoinCommunityStatus>;
  isJoining: boolean;
}

export function useJoinCommunity(): UseJoinCommunityResult {
  const { user } = useAuth();
  const [isJoining, setIsJoining] = useState(false);

  const joinCommunity = useCallback(async (community: AppCommunity): Promise<JoinCommunityStatus> => {
    setIsJoining(true);

    try {
      const member = await collabApiClient.member.add(community.id, {
        user_id: user!.id,
      }) as MemberResponse;

      const joinsDirectlyByCommunityRules = !!community.open_without_affiliation
        || Object.keys(community.open_with_email ?? {}).some((emailPattern) => (user?.email ?? "").endsWith(emailPattern));

      const joinsDirectly = member.role === "member"
        || member.role === "admin"
        || (!member.role && joinsDirectlyByCommunityRules);

      return joinsDirectly ? "joined" : "pending";
    } finally {
      setIsJoining(false);
    }
  }, [user]);

  return {
    joinCommunity,
    isJoining,
  };
}
