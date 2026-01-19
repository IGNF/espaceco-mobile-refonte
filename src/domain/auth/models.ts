import type { AppUser } from "@/domain/user/models";

/**
 * Result of an authentication operation
 */
export interface AuthResult {
	success: boolean;
	user: AppUser | null;
	error?: Error;
}

/**
 * OAuth tokens
 */
export interface AuthTokens {
	accessToken: string;
	refreshToken?: string;
	expiresIn?: number;
}

/**
 * PKCE state for OAuth flow
 */
export interface PKCEState {
	codeVerifier: string;
	state: string;
}

/**
 * Result of a token refresh operation
 */
export interface RefreshResult {
	success: boolean;
	error?: Error;
}
