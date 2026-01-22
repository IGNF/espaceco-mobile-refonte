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
 * Token response from OAuth server
 */
export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in: number;
  refresh_expires_in?: number;
  token_type: string;
  scope?: string;
}

/**
 * Result of token exchange operation
 */
export interface TokenExchangeResult {
  success: boolean;
  tokens?: AuthTokens;
  error?: Error;
}

/**
 * OAuth tokens expected by the collaboratif API
 */
export interface AuthTokens {
	accessToken: string;
	refreshToken?: string;
	expiresIn?: number;
	refreshExpiresIn?: number;
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
	tokens?: AuthTokens;
	error?: Error;
}
