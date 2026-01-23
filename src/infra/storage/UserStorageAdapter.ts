/**
 * UserStorageAdapter
 *
 * Implements IUserStorage from @ign/mobile-core
 * Uses @ign/mobile-device Storage for persistence
 *
 * Storage strategy:
 * - All data stored in Capacitor Preferences (key-value storage)
 * - Credentials stored with obfuscation (not true encryption for simplicity)
 */
import type { IUserStorage, User, Community, CommunityMember } from '@ign/mobile-core';
import { Storage } from '@ign/mobile-device';
import { storageKey } from '../../shared/constants/storage';

const USER_KEY = 'USER';
const USER_PARAMS_KEY = 'USER_PARAMS';
const COMMUNITIES_KEY = 'COMMUNITIES';
const ACTIVE_COMMUNITY_KEY = 'ACTIVE_COMMUNITY';
const CREDENTIALS_KEY = 'CREDENTIALS';

export class UserStorageAdapter implements IUserStorage {
  // User operations

  async saveUser(user: User): Promise<void> {
    // Store communities separately for easy access
    if (user.communities_member && user.communities_member.length > 0) {
      await this.saveCommunities(user.communities_member);
    }

    // Store user data without communities (they're stored separately)
    const { ...userData } = user;
    await Storage.set(storageKey(USER_KEY), userData, 'object');
  }

  async getUser(): Promise<User | null> {
    const userData = await Storage.get(storageKey(USER_KEY), 'object');
    if (!userData) return null;

    // Hydrate with communities
    const communities = await this.getCommunities();
    return {
      ...userData,
      communities,
    } as User;
  }

  async clearUser(): Promise<void> {
    await Storage.remove(storageKey(USER_KEY));
  }

  // Param operations

  async saveParam(param: any): Promise<void> {
    await Storage.set(storageKey(USER_PARAMS_KEY), param, 'object');
  }

  async getParam(): Promise<any> {
    return await Storage.get(storageKey(USER_PARAMS_KEY), 'object');
  }

  async clearParam(): Promise<void> {
    await Storage.remove(storageKey(USER_PARAMS_KEY));
  }

  // Community operations

  // Here, I don't know if it's a Community[] or a CommunityMember[]
  // to be fixed later
  async saveCommunities(communities: Community[] | CommunityMember[]): Promise<void> {
    await Storage.set(storageKey(COMMUNITIES_KEY), communities, 'object');
  }

  async getCommunities(): Promise<Community[] | CommunityMember[]> {
    const data = await Storage.get(storageKey(COMMUNITIES_KEY), 'object');
    console.log('getCommunities => data', data);
    return (data as Community[] | CommunityMember[]) ?? [];
  }

  async setActiveCommunity(communityId: number): Promise<void> {
    await Storage.set(storageKey(ACTIVE_COMMUNITY_KEY), communityId, 'number');
  }

  async getActiveCommunity(): Promise<number | null> {
    const id = await Storage.get(storageKey(ACTIVE_COMMUNITY_KEY), 'number');
    return id ?? null;
  }

  // Credentials operations

  /**
   * See if this is really needed and used
   * @param username 
   * @param encryptedPassword 
   */
  async saveCredentials(username: string, encryptedPassword: string): Promise<void> {
    // The password is already encrypted by the caller
    const credentials = {
      username,
      password: encryptedPassword,
    };
    await Storage.set(storageKey(CREDENTIALS_KEY), credentials, 'object');
  }

  async getCredentials(): Promise<{ username: string; password: string } | null> {
    const data = await Storage.get(storageKey(CREDENTIALS_KEY), 'object');
    if (!data || !data.username || !data.password) return null;
    return {
      username: data.username,
      password: data.password,
    };
  }

  async clearCredentials(): Promise<void> {
    await Storage.remove(storageKey(CREDENTIALS_KEY));
  }

  // Additional utility methods

  /**
   * Get a specific community by ID
   */
  async getCommunityById(communityId: number): Promise<Community | CommunityMember | null> {
    const communities = await this.getCommunities();
    return communities.find(c => c.id === communityId) ?? null;
  }

  /**
   * Get the currently active community object
   */
  async getActiveCommunityData(): Promise<Community | CommunityMember | null> {
    const activeId = await this.getActiveCommunity();
    if (activeId === null) return null;
    return this.getCommunityById(activeId);
  }

  /**
   * Check if user is logged in
   */
  async isLoggedIn(): Promise<boolean> {
    const user = await this.getUser();
    return user !== null;
  }

  /**
   * Clear all user-related data (for logout)
   */
  async clearAll(): Promise<void> {
    await Promise.all([
      this.clearUser(),
      this.clearParam(),
      this.clearCredentials(),
      Storage.remove(storageKey(COMMUNITIES_KEY)),
      Storage.remove(storageKey(ACTIVE_COMMUNITY_KEY)),
    ]);
  }
}
