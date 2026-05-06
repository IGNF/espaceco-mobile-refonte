import type { User } from '@ign/mobile-core';
import type { CommunityThemeConfig } from '@/domain/community/models';

export type DisplayMode = 'beginner' | 'advanced' | 'expert'; // débutant, confirmé, expert

export interface SharedThemeCommunity extends Record<string, unknown> {
  community_id?: number;
  community_name?: string;
  themes?: CommunityThemeConfig[];
}

export interface AppUser extends User { // in case we need more property than what the module offers
  isAnonymous?: boolean;
  displayMode?: DisplayMode;
  appData?: object;
  shared_themes?: SharedThemeCommunity[];
}
