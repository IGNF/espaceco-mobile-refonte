import type { AppUser } from "./models";

export interface ApiUserResponse {
	id: number;
	email: string;
	firstName: string;
	lastName: string;
	username: string;
	avatarUrl?: string;
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
		avatarUrl: apiUser.avatarUrl,
		description: apiUser.description,
		communities: apiUser.communities || [],
	};
}
