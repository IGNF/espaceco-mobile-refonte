import { useState, useCallback, useEffect, type ReactNode } from "react";
import type { Community } from "@ign/mobile-core";
import { CommunityContext } from "./CommunityContext";
import { UserStorageAdapter } from "@/infra/storage";
import { useAuth } from "@/features/auth/hooks/useAuth";

interface CommunityProviderProps {
  children: ReactNode;
}

// Singleton instance of the storage adapter
const userStorage = new UserStorageAdapter();

/**
 * CommunityProvider manages the active community state.
 * It loads the active community from storage on mount and provides
 * methods to change the active community.
 */
export function CommunityProvider({ children }: CommunityProviderProps) {
  const { user } = useAuth();
  const [activeCommunity, setActiveCommunityState] = useState<Community | null>(null);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load communities and active community from storage
  const loadCommunityData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [storedCommunities, activeData] = await Promise.all([
        userStorage.getCommunities(),
        userStorage.getActiveCommunityData(),
      ]);
      console.log('loadCommunityData => storedCommunities', storedCommunities);
      setCommunities(storedCommunities);
      setActiveCommunityState(activeData as Community | null);
    } catch (error) {
      console.error("Failed to load community data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load data when user changes (login/logout)
  useEffect(() => {
    loadCommunityData();
  }, [loadCommunityData, user]);

  // Set active community
  const setActiveCommunity = useCallback(async (communityId: number) => {
    console.log('setActiveCommunity => communityId', communityId);
    try {
      await userStorage.setActiveCommunity(communityId);
      const community = await userStorage.getCommunityById(communityId);
      setActiveCommunityState(community as Community | null);
    } catch (error) {
      console.error("Failed to set active community:", error);
      throw error;
    }
  }, []);

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
        setActiveCommunity,
        refreshCommunities,
      }}
    >
      {children}
    </CommunityContext.Provider>
  );
}
