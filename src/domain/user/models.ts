/**
 * What to do here is import directly the types from the mobile-core module
 * 
 * Have something maybe like:
 * 
 * export EspaceCo_User extends User {} // in case we need more property than what the module offers
 */

export interface User {
  id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  // communities: Community[];
  // communities_member?: CommunityMember[];
}