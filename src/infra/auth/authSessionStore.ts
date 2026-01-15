import { Storage } from '@ign/mobile-device';

import { storageKey } from "@/shared/constants/storage";
import type { AuthTokens } from "./types";

const ACCESS_TOKEN_KEY = storageKey("access_token");
const REFRESH_TOKEN_KEY = storageKey("refresh_token");
const TOKEN_EXPIRY_KEY = storageKey("token_expiry");

/**
 * Auth session store for managing authentication tokens.
 * Handles storage and retrieval of access tokens, refresh tokens, and token expiration tracking.
 */
export const authSessionStore = {
	/**
	 * Store authentication tokens
	 */
	async setTokens(tokens: AuthTokens): Promise<void> {
		await Storage.set(ACCESS_TOKEN_KEY, tokens.accessToken, 'string');

		if (tokens.refreshToken) {
			await Storage.set(REFRESH_TOKEN_KEY, tokens.refreshToken, 'string');
		}

		if (tokens.expiresIn) {
			const expiryTime = Date.now() + tokens.expiresIn * 1000;
			await Storage.set(TOKEN_EXPIRY_KEY, String(expiryTime), 'string');
		}
	},

	/**
	 * Get the current access token
	 */
	async getAccessToken(): Promise<string | null> {
		return Storage.get(ACCESS_TOKEN_KEY, 'string');
	},

	/**
	 * Get the refresh token
	 */
	async getRefreshToken(): Promise<string | null> {
		return Storage.get(REFRESH_TOKEN_KEY, 'string');
	},

	/**
	 * Check if the access token is expired
	 */
	async isTokenExpired(): Promise<boolean> {
		// to implement
    return false;
	},

	/**
	 * Check if there is a valid session (has token and not expired)
	 */
	async hasValidSession(): Promise<boolean> {
		return !!(await this.getAccessToken()) && !(await this.isTokenExpired());
	},

	/**
	 * Clear all stored tokens
	 */
	async clear(): Promise<void> {
		await Storage.remove(ACCESS_TOKEN_KEY);
		await Storage.remove(REFRESH_TOKEN_KEY);
		await Storage.remove(TOKEN_EXPIRY_KEY);
	},
};
