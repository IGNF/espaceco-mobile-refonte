import type { User } from '@ign/mobile-core';
export interface AppUser extends User { // in case we need more property than what the module offers
  isAnonymous?: boolean;
  appData?: object;
}