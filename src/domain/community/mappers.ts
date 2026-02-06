import type { Community } from '@ign/mobile-core';
import type { AppCommunity } from './models';

interface ApiCommunityResponse extends Community {
  // this attribute is not present in the API response, so we're not using it
  // it should be added in the future
  // and then should be added to the core Community interface
  all_members_can_valid?: boolean;
}

export function mapApiCommunityToAppCommunity(apiCommunity: ApiCommunityResponse): AppCommunity {
  return {
    ...apiCommunity,
    allMembersCanValid: apiCommunity.all_members_can_valid ?? false,
    appData: {},
  };
}
