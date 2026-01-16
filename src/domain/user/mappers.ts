import type { AppUser } from "./models";

export interface ApiUserResponse {
	id: number;
	email: string;
	firstName: string;
	lastName: string;
	username: string;
	avatar?: string; // API field name
	description?: string;
	communities?: Array<{ id: number; name: string }>;
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
	};
}
