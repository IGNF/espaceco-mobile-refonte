import type { AppUser } from "./models";
import type { Community, CommunityMember } from "@ign/mobile-core";

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
}

export function mapApiUserToAppUser(apiUser: ApiUserResponse): AppUser {
	return {
		id: apiUser.id,
		email: apiUser.email,
		firstName: apiUser.firstName,
		lastName: apiUser.lastName,
		username: apiUser.username,
		avatarUrl: apiUser.avatar,
		description: apiUser.description,
    communities: apiUser.communities || [],
		communities_member: apiUser.communities_member || [],
	};
}
