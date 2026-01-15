import type { AppUser } from "@/domain/user/models";
import type { ApiUserResponse } from "@/domain/user/mappers";

export interface LoginResponse {
	user: ApiUserResponse;
	accessToken: string;
	refreshToken?: string;
	expiresIn?: number;
}

export interface RefreshTokenResponse {
	accessToken: string;
	refreshToken?: string;
	expiresIn?: number;
}

export interface AuthResult {
	success: boolean;
	user: AppUser | null;
	error?: Error;
}

export interface AuthTokens {
	accessToken: string;
	refreshToken?: string;
	expiresIn?: number;
}
