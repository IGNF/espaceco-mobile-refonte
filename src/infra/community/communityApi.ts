/**
 * Community API
 *
 * Handles fetching communities from the backend
 */
import type { Community } from '@ign/mobile-core';

// TODO: Replace with actual API base URL from environment
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://espacecollaboratif.ign.fr/api';

export interface FetchCommunitiesParams {
  userId?: number;
}

export interface FetchCommunitiesResponse {
  communities: Community[];
}

/**
 * Fetch communities the user has access to
 */
export async function fetchCommunities(params?: FetchCommunitiesParams): Promise<Community[]> {
  const url = new URL(`${API_BASE_URL}/communities`);

  if (params?.userId) {
    url.searchParams.set('user_id', String(params.userId));
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch communities: ${response.status}`);
  }

  const data: FetchCommunitiesResponse = await response.json();
  return data.communities;
}

/**
 * Fetch a single community by ID
 */
export async function fetchCommunityById(communityId: number): Promise<Community> {
  const response = await fetch(`${API_BASE_URL}/communities/${communityId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch community: ${response.status}`);
  }

  return response.json();
}
