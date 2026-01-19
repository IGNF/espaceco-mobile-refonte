import { Device } from '@capacitor/device';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';
import { CapacitorHttp } from '@capacitor/core';

import { Storage } from '@ign/mobile-device'
import { storageKey } from '@/shared/constants/storage';

import { collabApiClient } from "@/infra/api/collabApiClient";
import { mapApiUserToAppUser, type ApiUserResponse } from "@/domain/user/mappers";
import type { AppUser } from "@/domain/user/models";
import type { AuthResult, RefreshResult } from "@/domain/auth/models";
import { config } from "@/shared/config/env";

import { generateCodeChallengeFromVerifier, generateCodeVerifier } from "@/shared/utils/auth";

// Re-export domain types for convenience
export type { AuthResult, RefreshResult } from "@/domain/auth/models";

/**
 * Login with email and password.
 * Uses OAuth2 password grant via Keycloak.
 */
export async function loginWithPassword(email: string, password: string): Promise<AuthResult> {
  try {
    collabApiClient.setCredentials(email, password);
    const response = await collabApiClient.getUser("me");
    const user = mapApiUserToAppUser(response.data as ApiUserResponse);

    return { success: true, user };
  } catch (error) {
    collabApiClient.disconnect();

    const message = error instanceof Error ? error.message : "Authentication failed";

    if (message.includes("401") || message.includes("Unauthorized")) {
      return { success: false, user: null, error: new Error("Invalid email or password") };
    }

    return { success: false, user: null, error: new Error(message) };
  }
}

/**
 * Login with OAuth using PKCE flow
 */
export async function loginWithOAuth(): Promise<AuthResult> {
  // Generate PKCE values
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallengeFromVerifier(codeVerifier);

  // Store code verifier for later use in token exchange
  await Storage.set(storageKey('temp_code_verifier'), codeVerifier);

  const operatingSystem = (await Device.getInfo()).platform;
  const redirectUri = operatingSystem === 'android'
    ? config.oAuth.androidRedirectUri
    : config.oAuth.iosRedirectUri;

  const authUrl = `${config.oAuth.baseUrl}/auth?` + new URLSearchParams({
    client_id: config.oAuth.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile email',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  }).toString();

  return new Promise((resolve) => {
    const handleCallback = async ({ url }: { url: string }) => {
      // Only handle our redirect URI
      if (!url.startsWith(redirectUri.split('?')[0])) {
        return;
      }

      // Remove the listener
      App.removeAllListeners();

      // Close the browser
      await Browser.close();

      try {
        const urlObject = new URL(url);
        const code = urlObject.searchParams.get('code');
        const error = urlObject.searchParams.get('error');

        if (error) {
          await Storage.remove(storageKey('temp_code_verifier'));
          resolve({ success: false, user: null, error: new Error(error) });
          return;
        }

        if (!code) {
          await Storage.remove(storageKey('temp_code_verifier'));
          resolve({ success: false, user: null, error: new Error('No authorization code received') });
          return;
        }

        // Exchange code for tokens
        const tokenResult = await exchangeCodeForTokens(code, redirectUri);
        if (!tokenResult.success) {
          resolve({ success: false, user: null, error: tokenResult.error });
          return;
        }

        // Fetch user info
        const accessToken = await getStoredAccessToken();
        if (!accessToken) {
          resolve({ success: false, user: null, error: new Error('No access token after exchange') });
          return;
        }

        const user = await fetchUserInfo(accessToken);
        resolve({ success: true, user });
      } catch (err) {
        await Storage.remove(storageKey('temp_code_verifier'));
        const message = err instanceof Error ? err.message : 'OAuth callback failed';
        resolve({ success: false, user: null, error: new Error(message) });
      }
    };

    App.addListener('appUrlOpen', handleCallback);

    // Open the browser for authentication
    Browser.open({ url: authUrl });
  });
}

/**
 * Result of token exchange operation
 */
interface TokenExchangeResult {
  success: boolean;
  error?: Error;
}

/**
 * Exchange authorization code for tokens
 */
async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<TokenExchangeResult> {
  const codeVerifier = await Storage.get(storageKey('temp_code_verifier'));

  if (!codeVerifier) {
    return { success: false, error: new Error('Code verifier not found') };
  }

  try {
    const tokenUrl = `${config.oAuth.baseUrl}/token`;

    // Use CapacitorHttp to bypass CORS restrictions
    const response = await CapacitorHttp.post({
      url: tokenUrl,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: config.oAuth.clientId,
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }).toString(),
    });

    if (response.status >= 400) {
      throw new Error(`Token exchange failed: ${JSON.stringify(response.data)}`);
    }

    // Store tokens
    await storeTokens(response.data);

    // Clean up temporary storage
    await Storage.remove(storageKey('temp_code_verifier'));

    return { success: true };
  } catch (err) {
    await Storage.remove(storageKey('temp_code_verifier'));
    const message = err instanceof Error ? err.message : 'Token exchange failed';
    return { success: false, error: new Error(message) };
  }
}

/**
 * Fetch user info from the collab API using the OAuth access token
 */
async function fetchUserInfo(accessToken: string): Promise<AppUser | null> {
  try {
    const response = await CapacitorHttp.get({
      url: `${config.api.baseUrl}/users/me`,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (response.status >= 400) {
      return null;
    }

    const userData = response.data as ApiUserResponse;
    return mapApiUserToAppUser(userData);
  } catch {
    return null;
  }
}

/**
 * Token response from OAuth server
 */
interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in: number;
  refresh_expires_in?: number;
  token_type: string;
  scope?: string;
}

/**
 * Store tokens and expiry dates in storage
 */
async function storeTokens(tokens: TokenResponse): Promise<void> {
  const now = Date.now();

  // Calculate expiry timestamps (expires_in is in seconds)
  const accessTokenExpiresAt = now + (tokens.expires_in * 1000);

  await Storage.set(storageKey('access_token'), tokens.access_token);
  await Storage.set(storageKey('access_token_expires_at'), accessTokenExpiresAt.toString());

  if (tokens.refresh_token) {
    await Storage.set(storageKey('refresh_token'), tokens.refresh_token);

    if (tokens.refresh_expires_in) {
      const refreshTokenExpiresAt = now + (tokens.refresh_expires_in * 1000);
      await Storage.set(storageKey('refresh_token_expires_at'), refreshTokenExpiresAt.toString());
    }
  }

  if (tokens.id_token) {
    await Storage.set(storageKey('id_token'), tokens.id_token);
  }
}

/**
 * Refresh the access token using the stored refresh token
 */
export async function refreshAccessToken(): Promise<RefreshResult> {
  const refreshToken = await Storage.get(storageKey('refresh_token'));

  if (!refreshToken) {
    return { success: false, error: new Error('No refresh token available') };
  }

  // Check if refresh token is expired
  const refreshExpiresAt = await Storage.get(storageKey('refresh_token_expires_at'));
  if (refreshExpiresAt && Date.now() >= parseInt(refreshExpiresAt, 10)) {
    return { success: false, error: new Error('Refresh token expired') };
  }

  try {
    const tokenUrl = `${config.oAuth.baseUrl}/token`;

    const response = await CapacitorHttp.post({
      url: tokenUrl,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: config.oAuth.clientId,
        refresh_token: refreshToken,
      }).toString(),
    });

    if (response.status >= 400) {
      throw new Error(`Token refresh failed: ${JSON.stringify(response.data)}`);
    }

    const tokens = response.data as TokenResponse;
    await storeTokens(tokens);

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Token refresh failed';
    return { success: false, error: new Error(message) };
  }
}

/**
 * Check if the access token is expired or about to expire
 * @param bufferSeconds - Consider token expired this many seconds before actual expiry (default: 60)
 */
export async function isAccessTokenExpired(bufferSeconds: number = 60): Promise<boolean> {
  const expiresAt = await Storage.get(storageKey('access_token_expires_at'));

  if (!expiresAt) {
    return true; // No expiry stored, consider expired
  }

  const expiryTime = parseInt(expiresAt, 10);
  const bufferMs = bufferSeconds * 1000;

  return Date.now() >= (expiryTime - bufferMs);
}

/**
 * Get the stored access token
 */
export async function getStoredAccessToken(): Promise<string | null> {
  return await Storage.get(storageKey('access_token'));
}

/**
 * Logout and clear credentials
 */
export async function logout(): Promise<void> {
  collabApiClient.disconnect();

  // Clear OAuth tokens
  await Storage.remove(storageKey('access_token'));
  await Storage.remove(storageKey('access_token_expires_at'));
  await Storage.remove(storageKey('refresh_token'));
  await Storage.remove(storageKey('refresh_token_expires_at'));
  await Storage.remove(storageKey('id_token'));
}

/**
 * Get the current user if logged in
 */
export async function getCurrentUser(): Promise<AuthResult> {
  if (collabApiClient.isConnected() === false) {
    return { success: false, user: null, error: new Error("Not authenticated") };
  }

  try {
    const response = await collabApiClient.getUser("me");
    const user = mapApiUserToAppUser(response.data as ApiUserResponse);
    return { success: true, user };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get user";
    return { success: false, user: null, error: new Error(message) };
  }
}

/**
 * Check if there's a valid session
 * TODO: Check if the access token is expired
 */
export async function isSessionValid(): Promise<boolean> {
  if (collabApiClient.isConnected() === false) return false;

  try {
    await collabApiClient.getUser("me");
    return true;
  } catch {
    return false;
  }
}
