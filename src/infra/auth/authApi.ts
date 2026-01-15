import { mapApiUserToAppUser, type ApiUserResponse } from "@/domain/user/mappers";
import { ignApi, ApiRequestError } from "@/infra/http/ignApi";
import { authSessionStore } from "./authSessionStore";
import type { AuthResult, AuthTokens, LoginResponse, RefreshTokenResponse } from "./types";

export type { AuthResult } from "./types";

export const authApi = {
	/**
	 * Login with email and password
	 */
	async login(email: string, password: string): Promise<AuthResult> {
		try {
      console.log("Login request", email, password);
			const { data } = await ignApi.post<LoginResponse>(
				"/auth/login",
				{ email, password },
				{ skipAuth: true }
			);
      console.log("Login response", data);
      
			// Store tokens
			const tokens: AuthTokens = {
				accessToken: data.accessToken,
				refreshToken: data.refreshToken,
				expiresIn: data.expiresIn,
			};
			authSessionStore.setTokens(tokens);

			// Map and return user
			const user = mapApiUserToAppUser(data.user);
			return { success: true, user };
		} catch (error) {
			if (error instanceof ApiRequestError) {
				return {
					success: false,
					user: null,
					error: new Error(error.message),
				};
			}
			return {
				success: false,
				user: null,
				error: error instanceof Error ? error : new Error("Login failed"),
			};
		}
	},

	/**
	 * Refresh the access token using the refresh token
	 */
	async refreshToken(): Promise<boolean> {
		const refreshToken = authSessionStore.getRefreshToken();
		if (!refreshToken) {
      // should display a message to the user and redirect them to the login again?
			return false;
		}

		try {
			const { data } = await ignApi.post<RefreshTokenResponse>(
				"/auth/refresh",
				{ refreshToken },
				{ skipAuth: true }
			);

			const tokens: AuthTokens = {
				accessToken: data.accessToken,
				refreshToken: data.refreshToken || refreshToken,
				expiresIn: data.expiresIn,
			};
			authSessionStore.setTokens(tokens);
			return true;
		} catch {
			// Refresh failed, clear session
			authSessionStore.clear();
			return false;
		}
	},

	/**
	 * Logout the current user
	 */
	async logout(): Promise<void> {
		try {
      console.log("Logout request");
			await ignApi.post("/auth/logout");
		} catch {
      console.log("Logout error");
		} finally {
			authSessionStore.clear();
		}
	},

	/**
	 * Get the current user profile
	 */
	async getCurrentUser(): Promise<AuthResult> {
		try {
			const { data } = await ignApi.get<ApiUserResponse>("/auth/me");
			const user = mapApiUserToAppUser(data);
			return { success: true, user };
		} catch (error) {
			if (error instanceof ApiRequestError) {
				return {
					success: false,
					user: null,
					error: new Error(error.message),
				};
			}
			return {
				success: false,
				user: null,
				error: error instanceof Error ? error : new Error("Failed to get user"),
			};
		}
	},

	/**
	 * Check if there is a valid session and refresh if needed
	 */
	async ensureValidSession(): Promise<boolean> {
		if (!authSessionStore.getAccessToken()) {
			return false;
		}

		if (authSessionStore.isTokenExpired()) {
			return await this.refreshToken();
		}

		return true;
	},
};
