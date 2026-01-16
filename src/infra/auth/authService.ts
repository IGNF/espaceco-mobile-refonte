import { Device } from '@capacitor/device';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';

import { Storage } from '@ign/mobile-device'
import { storageKey } from '@/shared/constants/storage';

import { collabApiClient } from "@/infra/api/collabApiClient";
import { mapApiUserToAppUser, type ApiUserResponse } from "@/domain/user/mappers";
import type { AppUser } from "@/domain/user/models";
import { config } from "@/shared/config/env";

import { generateCodeChallenge, generateCodeVerifier } from "@/shared/utils/auth";

/**
 * Result of an authentication operation
 */
export interface AuthResult {
  success: boolean;
  user: AppUser | null;
  error?: Error;
}

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
 * to be implemented
 * @returns 
 */
export async function loginWithOAuth(): Promise<AuthResult> {

  App.addListener('appUrlOpen', ({ url }) => {
    console.log('appUrlOpen', url);
  });

  const codeVerifier = generateCodeVerifier();
  await Storage.set(storageKey('temp_code_verifier'), codeVerifier);

  const codeChallenge = await generateCodeChallenge();
  await Storage.set(storageKey('temp_code_challenge'), codeChallenge);
  console.log('codeChallenge', codeChallenge);

  const operatingSystem = (await (Device.getInfo())).platform;
  const redirectUri = operatingSystem === 'android' ? config.oAuth.androidRedirectUri : config.oAuth.iosRedirectUri;
  console.log('redirectUri', redirectUri);
  
  const testURL = `https://sso.geopf.fr/realms/geoplateforme/protocol/openid-connect/auth?client_id=${config.oAuth.clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid profile email&code_challenge=${codeChallenge}&code_challenge_method=S256`;

  await Browser.open({
    url: testURL,
  });

  // ONCE AUTH, WE SHOULD REMOVE THE TEMP CODE VERIFIER AND CODE CHALLENGE FROM STORAGE
  await Storage.remove(storageKey('temp_code_verifier'));
  await Storage.remove(storageKey('temp_code_challenge'));

  return { success: true, user: null };
}

/**
 * Logout and clear credentials
 */
export async function logout(): Promise<void> {
  collabApiClient.disconnect();
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
