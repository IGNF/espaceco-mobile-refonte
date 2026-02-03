import type { Community } from '@ign/mobile-core';
import type { AppCommunity } from './models';

interface ApiCommunityResponse extends Community {
  all_members_can_valid?: boolean;
}

export function mapApiCommunityToAppCommunity(apiCommunity: ApiCommunityResponse): AppCommunity {
  return {
    ...apiCommunity,
    allMembersCanValid: apiCommunity.all_members_can_valid ?? false,
    appData: {},
  };
}
