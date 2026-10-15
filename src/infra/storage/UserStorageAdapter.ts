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
import type { IUserStorage, User } from '@ign/mobile-core';
import { Storage } from '@ign/mobile-device';
import { storageKey } from '../../shared/constants/storage';
import { collabApiClient } from '../api/collabApiClient';
import { mapApiCommunityToAppCommunity } from '@/domain/community/mappers';
import type { AppCommunity } from '@/domain/community/models';

const USER_KEY = 'USER';
const USER_PARAMS_KEY = 'USER_PARAMS';
const COMMUNITIES_KEY = 'COMMUNITIES';
const ACTIVE_COMMUNITY_KEY = 'ACTIVE_COMMUNITY';
const CREDENTIALS_KEY = 'CREDENTIALS';
// Kept after logout so the login page can reopen the last account offline.
const USER_ID_KEY = 'USER_ID';
const COMMUNITY_ID_KEY = 'COMMUNITY_ID';
const STORED_USER_KEY = 'STORED_USER';
const STORED_COMMUNITIES_KEY = 'STORED_COMMUNITIES';

export class UserStorageAdapter implements IUserStorage {
  // User operations

  async saveUser(user: User): Promise<void> {
    console.log('saveUser => user', user);
    // Store communities separately for easy access
    if (user.communities_member && user.communities_member.length > 0) {
      console.log('saveUser => user.communities_member', user.communities_member.length);

      const userCommunities = await Promise.all(user.communities_member.map(async (communityMember) => {
        const community = (await collabApiClient.community.get(communityMember.community_id)).data;
        return mapApiCommunityToAppCommunity(community);
      }));
      console.log('userCommunities', userCommunities);

      // to test in real conditions
      await this.saveCommunities(userCommunities);
    }

    await Storage.set(storageKey(USER_KEY), user, 'object');
    await this.saveUserId(user.id);
  }

  async getUserId(): Promise<number | null> {
    const userId = await Storage.get(storageKey(USER_ID_KEY), 'number');
    return userId ?? null;
  }

  private async saveUserId(userId: number): Promise<void> {
    const storedUserId = await this.getUserId();
    if (storedUserId !== null && storedUserId !== userId) {
      await Storage.remove(storageKey(COMMUNITY_ID_KEY));
    }
    await Storage.set(storageKey(USER_ID_KEY), userId, 'number');
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
    await this.keepAccountIds();
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

  async saveCommunities(communities: AppCommunity[]): Promise<void> {
    await Storage.set(storageKey(COMMUNITIES_KEY), communities, 'object');
  }

  async getCommunities(): Promise<AppCommunity[]> {
    const data = await Storage.get(storageKey(COMMUNITIES_KEY), 'object');
    console.log('getCommunities => data', data);
    return (data as AppCommunity[]) ?? [];
  }

  async setActiveCommunity(communityId: number): Promise<void> {
    await Storage.set(storageKey(ACTIVE_COMMUNITY_KEY), communityId, 'number');
    await this.saveCommunityId(communityId);
  }

  async getCommunityId(): Promise<number | null> {
    const communityId = await Storage.get(storageKey(COMMUNITY_ID_KEY), 'number');
    return communityId ?? null;
  }

  private async saveCommunityId(communityId: number): Promise<void> {
    await Storage.set(storageKey(COMMUNITY_ID_KEY), communityId, 'number');
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
  async getCommunityById(communityId: number): Promise<AppCommunity | null> {
    const communities = await this.getCommunities();
    return communities.find(c => c.id === communityId) ?? null;
  }

  /**
   * Get the currently active community object
   */
  async getActiveCommunityData(): Promise<AppCommunity | null> {
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
   * Clears the logged-in session.
   * USER_ID and COMMUNITY_ID stay stored so the login page can still read the last account offline.
   */
  async clearAll(): Promise<void> {
    await this.clearUser();
    await Promise.all([
      this.clearParam(),
      this.clearCredentials(),
      Storage.remove(storageKey(COMMUNITIES_KEY)),
      Storage.remove(storageKey(ACTIVE_COMMUNITY_KEY)),
    ]);
  }

  /**
   * Writes the last account back into the session keys so the app can open offline.
   * Falls back to the stored ids when the full snapshot is missing.
   */
  async restoreStoredAccount(): Promise<User | null> {
    const userId = await this.getUserId();
    const communityId = await this.getCommunityId();
    if (userId === null || communityId === null) {
      return null;
    }

    const storedUser = await Storage.get(storageKey(STORED_USER_KEY), 'object') as User | null;
    const user = storedUser?.id === userId
      ? storedUser
      : { id: userId, username: '', communities: [] } satisfies User;

    const storedCommunities = await Storage.get(storageKey(STORED_COMMUNITIES_KEY), 'object') as AppCommunity[] | null;
    const communities = storedCommunities?.some((community) => community.id === communityId)
      ? storedCommunities
      : [
          ...(storedCommunities ?? []),
          { id: communityId, name: '', allMembersCanValid: false, appData: {} } satisfies AppCommunity,
        ];

    await Storage.set(storageKey(USER_KEY), user, 'object');
    await this.saveCommunities(communities);
    await Storage.set(storageKey(ACTIVE_COMMUNITY_KEY), communityId, 'number');
    return user;
  }

  private async keepAccountIds(): Promise<void> {
    const userData = await Storage.get(storageKey(USER_KEY), 'object') as User | null;
    const communities = await this.getCommunities();
    const activeCommunityId = await this.getActiveCommunity();

    if (userData) {
      await this.saveUserId(userData.id);
      await Storage.set(storageKey(STORED_USER_KEY), userData, 'object');
    }
    if (communities.length > 0) {
      await Storage.set(storageKey(STORED_COMMUNITIES_KEY), communities, 'object');
    }
    if (activeCommunityId !== null) {
      await this.saveCommunityId(activeCommunityId);
    }
  }
}
