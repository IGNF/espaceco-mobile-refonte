import type { Community, CommunityLayer, CommunityMember } from "@ign/mobile-core";

export interface AppCommunity extends Community {
  appData: object;
}

export interface AppCommunityLayer extends CommunityLayer {
  appData: object;
}

export interface AppCommunityMember extends CommunityMember {
  appData: object;
}