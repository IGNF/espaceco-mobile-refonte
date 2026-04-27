import type { User } from '@ign/mobile-core';

export type DisplayMode = 'beginner' | 'advanced' | 'expert'; // débutant, confirmé, expert
export interface AppUser extends User { // in case we need more property than what the module offers
  isAnonymous?: boolean;
  displayMode?: DisplayMode;
  appData?: object;
}