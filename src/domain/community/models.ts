import type { Community, CommunityLayer, CommunityMember } from "@ign/mobile-core";

export interface AppCommunity extends Community {
  allMembersCanValid: boolean; // If this attribute really exists, it should be added to the core Community interface
  appData: object;
}

export interface AppCommunityLayer extends CommunityLayer {
  appData: object;
}

export interface AppCommunityMember extends CommunityMember {
  appData: object;
}