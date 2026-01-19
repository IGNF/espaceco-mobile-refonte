import type { AuthResult, RefreshResult } from "./models";

/**
 * Interface for authentication services.
 * This allows swapping between password auth and OAuth + PKCE later.
 */
export interface IAuthService {
	loginWithPassword(email: string, password: string): Promise<AuthResult>;
	loginWithOAuth(): Promise<AuthResult>;
	logout(): Promise<void>;
	getCurrentUser(): Promise<AuthResult>;
	isSessionValid(): Promise<boolean>;
}

/**
 * Interface for OAuth token management.
 * Handles token storage, retrieval, and refresh.
 */
export interface ITokenManager {
	refreshAccessToken(): Promise<RefreshResult>;
	isAccessTokenExpired(bufferSeconds?: number): Promise<boolean>;
	getStoredAccessToken(): Promise<string | null>;
}
