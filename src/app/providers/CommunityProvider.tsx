import { useState, useCallback, useEffect, type ReactNode } from "react";
import type { CommunityMember } from "@ign/mobile-core";
import type { AppCommunity } from "@/domain/community/models";
import { CommunityContext } from "./CommunityContext";
import { UserStorageAdapter } from "@/infra/storage";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { appVariant } from "@/shared/config/appVariant";

interface CommunityProviderProps {
  children: ReactNode;
}

// Singleton instance of the storage adapter
const userStorage = new UserStorageAdapter();
const fixedCommunityId = appVariant.fixedCommunityId ?? null;

function hasActiveMembership(communityId: number, memberships: CommunityMember[] | undefined): boolean {
  return memberships?.some((membership) => membership.community_id === communityId && membership.role !== 'pending') ?? false;
}

/**
 * CommunityProvider manages the active community state.
 * It loads the active community from storage on mount and provides
 * methods to change the active community.
 */
export function CommunityProvider({ children }: CommunityProviderProps) {
  const { user } = useAuth();
  const [activeCommunity, setActiveCommunityState] = useState<AppCommunity | null>(null);
  const [communities, setCommunities] = useState<AppCommunity[]>([]);
  const [hasRequiredCommunityAccess, setHasRequiredCommunityAccess] = useState(fixedCommunityId === null);
  const [isLoading, setIsLoading] = useState(true);

  // Load communities and active community from storage
  const loadCommunityData = useCallback(async () => {
    setIsLoading(true);
    try {
      const storedCommunities = await userStorage.getCommunities();
      console.log('loadCommunityData => storedCommunities', storedCommunities);

      if (fixedCommunityId !== null) {
        const fixedCommunity = storedCommunities.find((community) => community.id === fixedCommunityId) ?? null;
        const canAccessFixedCommunity = fixedCommunity !== null && hasActiveMembership(fixedCommunityId, user?.communities_member);

        setCommunities(fixedCommunity ? [fixedCommunity] : []);
        setHasRequiredCommunityAccess(canAccessFixedCommunity);

        if (canAccessFixedCommunity) {
          await userStorage.setActiveCommunity(fixedCommunityId);
          setActiveCommunityState(fixedCommunity);
        } else {
          setActiveCommunityState(null);
        }
        return;
      }

      const activeData = await userStorage.getActiveCommunityData();
      setCommunities(storedCommunities);
      setHasRequiredCommunityAccess(true);
      setActiveCommunityState(activeData as AppCommunity | null);
    } catch (error) {
      console.error("Failed to load community data:", error);
      setHasRequiredCommunityAccess(false);
    } finally {
      setIsLoading(false);
    }
  }, [user?.communities_member]);

  // Load data when the user identity changes (login/logout)
  // Using user?.id as dependency instead of the user object to avoid re-fetching on every object reference change
  const userId = user?.id ?? null;
  useEffect(() => {
    loadCommunityData();
  }, [loadCommunityData, userId]);

  // Set active community
  const setActiveCommunity = useCallback(async (communityId: number) => {
    const targetCommunityId = fixedCommunityId ?? communityId;
    console.log('setActiveCommunity => communityId', targetCommunityId);
    try {
      if (fixedCommunityId !== null && !hasRequiredCommunityAccess) {
        throw new Error(`Current user cannot access required community ${fixedCommunityId}`);
      }

      await userStorage.setActiveCommunity(targetCommunityId);
      const community = await userStorage.getCommunityById(targetCommunityId);
      setActiveCommunityState(community as AppCommunity | null);
    } catch (error) {
      console.error("Failed to set active community:", error);
      throw error;
    }
  }, [hasRequiredCommunityAccess]);

  // Refresh communities from storage
  const refreshCommunities = useCallback(async () => {
    await loadCommunityData();
  }, [loadCommunityData]);

  return (
    <CommunityContext.Provider
      value={{
        activeCommunity,
        communities,
        isLoading,
        appVariant,
        fixedCommunityId,
        canSwitchCommunity: fixedCommunityId === null,
        hasRequiredCommunityAccess,
        setActiveCommunity,
        refreshCommunities,
      }}
    >
      {children}
    </CommunityContext.Provider>
  );
}
