import { useCallback, useEffect, useRef, useState } from "react";

import { collabApiClient } from "@/infra/api";

import { DEFAULT_COMMUNITIES_API_LIMIT } from "@/shared/constants/community";

import { mapApiCommunityToAppCommunity } from "@/domain/community/mappers";
import type { AppCommunity } from "@/domain/community/models";

interface UseAllCommunitiesResult {
  communities: AppCommunity[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
}

export function useAllCommunities(isOpen: boolean, searchTerm = ""): UseAllCommunitiesResult {
  const [communities, setCommunities] = useState<AppCommunity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const pageRef = useRef(1);
  const isLoadingRef = useRef(false);
  const hasMoreRef = useRef(true);

  const fetchCommunities = useCallback(async (page: number, append = false) => {
    isLoadingRef.current = true;

    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    setError(null);

    try {
      const response = await collabApiClient.community.getAll({
        page,
        limit: DEFAULT_COMMUNITIES_API_LIMIT,
        ...(searchTerm ? { name: searchTerm } : {}),
      });

      const nextCommunities = (response.data as AppCommunity[]).map(mapApiCommunityToAppCommunity);
      const receivedLessThanLimit = nextCommunities.length < DEFAULT_COMMUNITIES_API_LIMIT;
      setHasMore(!receivedLessThanLimit);
      hasMoreRef.current = !receivedLessThanLimit;

      if (append) {
        setCommunities((previousCommunities) => [...previousCommunities, ...nextCommunities]);
      } else {
        setCommunities(nextCommunities);
      }

      pageRef.current = page + 1;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch communities"));

      if (!append) {
        setCommunities([]);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      isLoadingRef.current = false;
    }
  }, [searchTerm]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    pageRef.current = 1;
    hasMoreRef.current = true;
    setHasMore(true);
    void fetchCommunities(1, false);
  }, [fetchCommunities, isOpen]);

  const loadMore = useCallback(async () => {
    if (isLoadingRef.current || !hasMoreRef.current) {
      return;
    }

    await fetchCommunities(pageRef.current, true);
  }, [fetchCommunities]);

  return {
    communities,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
  };
}
