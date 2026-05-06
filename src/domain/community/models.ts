import type {
  Community,
  CommunityMember,
  CommunityLayer,
} from '@ign/mobile-core';

export type CommunityAttributeType = 'text' | 'list' | 'checkbox' | 'date' | 'integer' | 'double';

export interface CommunityThemeAttribute {
  name: string;
  type: CommunityAttributeType;
  mandatory?: boolean;
  values?: string[]; // For 'list' type
  default?: string; // "0"/"1" for checkbox, text for others
}

export interface CommunityThemeConfig {
  theme: string;
  attributes: CommunityThemeAttribute[];
  autofilled_attributes: CommunityThemeAttribute[];
  // optional fields for shared themes
  communityId?: number;
  communityName?: string;
  global?: boolean;
  help?: string;
}

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
