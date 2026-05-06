import type { AppUser } from "./models";
import type { Community, CommunityMember } from "@ign/mobile-core";
import type { SharedThemeCommunity } from '@/domain/user/models';

export interface ApiUserResponse {
	id: number;
	email: string;
	firstName: string;
	lastName: string;
	username: string;
	avatar?: string; // API field name
	description?: string;
	communities?: Community[];
	communities_member?: CommunityMember[];
  shared_themes?: SharedThemeCommunity[];
}

export function mapApiUserToAppUser(apiUser: ApiUserResponse): AppUser {
	return {
		id: apiUser.id,
		email: apiUser.email,
		firstName: apiUser.firstName,
		lastName: apiUser.lastName,
		username: apiUser.username,
		avatar: apiUser.avatar,
		description: apiUser.description,
    communities: apiUser.communities || [],
		communities_member: apiUser.communities_member || [],
    shared_themes: apiUser.shared_themes || [],
	};
}
