import type { User } from '@ign/mobile-core';
export interface AppUser extends User { // in case we need more property than what the module offers
  isAnonymous?: boolean;
  avatarUrl?: string; // see if this should be moved to the User from mobile-core
  description?: string; // see if this should be moved to the User from mobile-core
  appData?: object;
}