import type { Community, CommunityLayer, CommunityMember, Geoservice, Table } from "@ign/mobile-core";

// We will have to add the missing properties from the CommunityLayer interface directly, to get rid of the EnrichedCommunityLayer interface
export interface EnrichedCommunityLayer extends CommunityLayer {
	geoservice?: Geoservice;
	table?: Table;
	database?: number;
	extent?: string[];
}

export type CommunityAttributeType = 'list' | 'checkbox' | 'date' | 'integer' | 'double';

export interface CommunityThemeAttribute {
  name: string;
  type: CommunityAttributeType;
  mandatory?: boolean;
  values?: string[];     // For 'list' type
  default?: string;      // "0"/"1" for checkbox, text for others
}

export interface CommunityThemeConfig {
  theme: string;
  attributes: CommunityThemeAttribute[];
  autofilled_attributes: CommunityThemeAttribute[];
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