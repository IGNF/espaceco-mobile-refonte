import { Browser } from '@capacitor/browser';
import { AuthManager, type AuthTokens as CoreAuthTokens } from '@ign/mobile-core';
import { Storage } from '@ign/mobile-device';

import { mapApiUserToAppUser, type ApiUserResponse } from '@/domain/user/mappers';
import type { AuthResult, AuthTokens, RefreshResult } from '@/domain/auth/models';
import { collabApiClient } from '@/infra/api/collabApiClient';
import { config } from '@/shared/config/env';
import { AppError, toAppError } from '@/shared/errors/appError';
import { storageKey } from '@/shared/constants/storage';
import i18n from '@/shared/i18n';
import { getRedirectUri } from '@/shared/utils/auth';
import { showToastSafe } from '@/shared/utils/toast';

export type { AuthResult, RefreshResult } from '@/domain/auth/models';

const authManager = new AuthManager({
  apiBaseUrl: config.api.baseUrl,
  oAuthBaseUrl: config.oAuth.baseUrl,
  oAuthClientId: config.oAuth.clientId,
});

async function storeTokens(tokens: CoreAuthTokens): Promise<void> {
  const now = Date.now();

  await Storage.set(storageKey('access_token'), tokens.accessToken);

  if (tokens.expiresIn) {
    await Storage.set(storageKey('access_token_expires_at'), String(now + (tokens.expiresIn * 1000)));
  } else {
    await Storage.remove(storageKey('access_token_expires_at'));
  }

  if (tokens.refreshToken) {
    await Storage.set(storageKey('refresh_token'), tokens.refreshToken);
  } else {
    await Storage.remove(storageKey('refresh_token'));
  }

  if (tokens.refreshToken && tokens.refreshExpiresIn) {
    await Storage.set(storageKey('refresh_token_expires_at'), String(now + (tokens.refreshExpiresIn * 1000)));
  } else {
    await Storage.remove(storageKey('refresh_token_expires_at'));
  }

  if (tokens.idToken) {
    await Storage.set(storageKey('id_token'), tokens.idToken);
  } else {
    await Storage.remove(storageKey('id_token'));
  }
}

function setExternalToken(tokens: AuthTokens): void {
  collabApiClient.setExternalToken(
    tokens.accessToken,
    tokens.refreshToken ?? '',
    tokens.expiresIn,
    tokens.refreshExpiresIn
  );
}

function clearInMemoryAuthState(): void {
  collabApiClient.username = null;
  collabApiClient.password = null;

  if (!collabApiClient.clientAuth) {
    return;
  }

  collabApiClient.clientAuth.started = false;
  collabApiClient.clientAuth.usesExternalToken = false;
  collabApiClient.clientAuth.token = null;
  collabApiClient.clientAuth.refreshToken = null;
  collabApiClient.clientAuth.expirationDate = null;
  collabApiClient.clientAuth.refreshExpirationDate = null;
}

async function clearStoredAuthState(): Promise<void> {
  const keys = ['access_token', 'access_token_expires_at', 'refresh_token', 'refresh_token_expires_at', 'id_token', 'temp_code_verifier'];
  await Promise.all(keys.map(key => Storage.remove(storageKey(key))));
}

export async function loginWithPassword(email: string, password: string): Promise<AuthResult> {
  try {
    const result = await authManager.loginWithPassword(email, password);

    if (!result.success || !result.user) {
      try {
        collabApiClient.disconnect();
      } catch {
        // The client can already be disconnected.
      }

      if (result.error?.message === 'Unauthorized') {
        return {
          success: false,
          user: null,
          error: new AppError({ kind: 'unauthorized', translationKey: 'errors.auth.invalidCredentials', retryable: false, cause: result.error }),
        };
      }

      return {
        success: false,
        user: null,
        error: toAppError(result.error, { fallbackKind: 'unknown', fallbackTranslationKey: 'errors.auth.loginFailed' }),
      };
    }

    collabApiClient.setCredentials(email, password);

    return {
      success: true,
      user: {
        ...result.user,
        avatarUrl: result.user.avatar,
        description: result.user.description,
      },
    };
  } catch (error) {
    try {
      collabApiClient.disconnect();
    } catch {
      // The client can already be disconnected.
    }

    return {
      success: false,
      user: null,
      error: toAppError(error, { fallbackKind: 'unknown', fallbackTranslationKey: 'errors.auth.loginFailed' }),
    };
  }
}

export async function loginWithOAuth(): Promise<AuthResult> {
  try {
    const redirectUri = await getRedirectUri();
    const result = await authManager.loginWithOAuth(redirectUri);

    if (!result.success) {
      if (result.error?.message === 'OAuth redirect') {
        return {
          success: false,
          user: null,
          error: new AppError({ kind: 'unknown', translationKey: 'errors.auth.oauthRedirect', retryable: false, cause: result.error }),
        };
      }

      if (result.error?.message === 'Code verifier missing') {
        return {
          success: false,
          user: null,
          error: new AppError({ kind: 'validation', translationKey: 'errors.auth.codeVerifierMissing', retryable: false, cause: result.error }),
        };
      }

      if (result.error?.message === 'No authorization code') {
        return {
          success: false,
          user: null,
          error: new AppError({ kind: 'validation', translationKey: 'errors.auth.noAuthorizationCode', retryable: false, cause: result.error }),
        };
      }

      if (result.error?.message === 'Token exchange failed') {
        return {
          success: false,
          user: null,
          error: new AppError({ kind: 'unknown', translationKey: 'errors.auth.tokenExchangeFailed', retryable: false, cause: result.error }),
        };
      }

      return {
        success: false,
        user: null,
        error: toAppError(result.error, { fallbackKind: 'unknown', fallbackTranslationKey: 'errors.auth.oauthCallbackFailed' }),
      };
    }

    if (!result.user) {
      return {
        success: false,
        user: null,
        error: new AppError({ kind: 'unknown', translationKey: 'errors.auth.failedToFetchUserInfo', retryable: false }),
      };
    }

    if (!result.tokens?.accessToken) {
      return {
        success: false,
        user: null,
        error: new AppError({ kind: 'unknown', translationKey: 'errors.auth.noAccessTokenAfterExchange', retryable: false }),
      };
    }

    await storeTokens(result.tokens);
    setExternalToken(result.tokens);

    return {
      success: true,
      user: {
        ...result.user,
        avatarUrl: result.user.avatar,
        description: result.user.description,
      },
    };
  } catch (error) {
    return {
      success: false,
      user: null,
      error: toAppError(error, { fallbackKind: 'unknown', fallbackTranslationKey: 'errors.auth.oauthCallbackFailed' }),
    };
  } finally {
    try {
      await Browser.close();
    } catch {
      // The browser can already be closed.
    }
  }
}

export async function handleOAuthCallback(code: string): Promise<AuthResult> {
  try {
    const redirectUri = await getRedirectUri();
    const result = await authManager.completeOAuthCallback(code, redirectUri);

    if (!result.success) {
      if (result.error?.message === 'Code verifier missing') {
        return {
          success: false,
          user: null,
          error: new AppError({ kind: 'validation', translationKey: 'errors.auth.codeVerifierMissing', retryable: false, cause: result.error }),
        };
      }

      if (result.error?.message === 'Token exchange failed') {
        return {
          success: false,
          user: null,
          error: new AppError({ kind: 'unknown', translationKey: 'errors.auth.tokenExchangeFailed', retryable: false, cause: result.error }),
        };
      }

      return {
        success: false,
        user: null,
        error: toAppError(result.error, { fallbackKind: 'unknown', fallbackTranslationKey: 'errors.auth.oauthCallbackFailed' }),
      };
    }

    if (!result.user) {
      return {
        success: false,
        user: null,
        error: new AppError({ kind: 'unknown', translationKey: 'errors.auth.failedToFetchUserInfo', retryable: false }),
      };
    }

    if (!result.tokens?.accessToken) {
      return {
        success: false,
        user: null,
        error: new AppError({ kind: 'unknown', translationKey: 'errors.auth.noAccessTokenAfterExchange', retryable: false }),
      };
    }

    await storeTokens(result.tokens);
    setExternalToken(result.tokens);

    return {
      success: true,
      user: {
        ...result.user,
        avatarUrl: result.user.avatar,
        description: result.user.description,
      },
    };
  } catch (error) {
    return {
      success: false,
      user: null,
      error: toAppError(error, { fallbackKind: 'unknown', fallbackTranslationKey: 'errors.auth.oauthCallbackFailed' }),
    };
  }
}

export async function refreshAccessToken(): Promise<RefreshResult> {
  try {
    const refreshToken = await Storage.get(storageKey('refresh_token'));

    if (!refreshToken) {
      return {
        success: false,
        error: new AppError({ kind: 'unauthorized', translationKey: 'errors.auth.refreshTokenMissing', retryable: false }),
      };
    }

    const refreshExpiresAt = await Storage.get(storageKey('refresh_token_expires_at'));
    if (refreshExpiresAt && Date.now() >= parseInt(refreshExpiresAt, 10)) {
      void showToastSafe({
        text: i18n.t('login.sessionExpired'),
        duration: 'short',
        position: 'top',
      });

      return {
        success: false,
        error: new AppError({ kind: 'unauthorized', translationKey: 'errors.auth.refreshTokenExpired', retryable: false }),
      };
    }

    const result = await authManager.refreshAccessToken(refreshToken);

    if (!result.success || !result.tokens) {
      if (result.error?.message === 'Refresh token expired') {
        void showToastSafe({
          text: i18n.t('login.sessionExpired'),
          duration: 'short',
          position: 'top',
        });

        return {
          success: false,
          error: new AppError({ kind: 'unauthorized', translationKey: 'errors.auth.refreshTokenExpired', retryable: false, cause: result.error }),
        };
      }

      if (result.error?.message === 'Refresh token missing') {
        return {
          success: false,
          error: new AppError({ kind: 'unauthorized', translationKey: 'errors.auth.refreshTokenMissing', retryable: false, cause: result.error }),
        };
      }

      return {
        success: false,
        error: toAppError(result.error, { fallbackKind: 'unknown', fallbackTranslationKey: 'errors.auth.tokenRefreshFailed' }),
      };
    }

    await storeTokens(result.tokens);

    const tokens: AuthTokens = {
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      expiresIn: result.tokens.expiresIn,
      refreshExpiresIn: result.tokens.refreshExpiresIn,
    };

    return {
      success: true,
      tokens,
    };
  } catch (error) {
    return {
      success: false,
      error: toAppError(error, { fallbackKind: 'unknown', fallbackTranslationKey: 'errors.auth.tokenRefreshFailed' }),
    };
  }
}

export async function isAccessTokenExpired(bufferSeconds: number = 60): Promise<boolean> {
  try {
    const expiresAt = await Storage.get(storageKey('access_token_expires_at'));

    if (!expiresAt) {
      return true;
    }

    return Date.now() >= (parseInt(expiresAt, 10) - (bufferSeconds * 1000));
  } catch (error) {
    toAppError(error, { fallbackKind: 'unknown', fallbackTranslationKey: 'errors.auth.tokenRefreshFailed' });
    return true;
  }
}

export async function getStoredAccessToken(): Promise<string | null> {
  try {
    return await Storage.get(storageKey('access_token'));
  } catch (error) {
    toAppError(error, { fallbackKind: 'unknown', fallbackTranslationKey: 'errors.auth.noAccessTokenAfterExchange' });
    return null;
  }
}

export async function logout(): Promise<void> {
  const [accessToken, refreshToken] = await Promise.all([
    Storage.get(storageKey('access_token')),
    Storage.get(storageKey('refresh_token')),
  ]);

  clearInMemoryAuthState();
  await clearStoredAuthState();
  await authManager.logout(accessToken ?? '', refreshToken ?? '');
}

export async function getCurrentUser(): Promise<AuthResult> {
  if (collabApiClient.isConnected() === false) {
    return {
      success: false,
      user: null,
      error: new AppError({ kind: 'unauthorized', translationKey: 'errors.auth.notAuthenticated', retryable: false }),
    };
  }

  try {
    const response = await collabApiClient.user.get('me');

    return {
      success: true,
      user: mapApiUserToAppUser(response.data as ApiUserResponse),
    };
  } catch (error) {
    return {
      success: false,
      user: null,
      error: toAppError(error, { fallbackKind: 'unknown', fallbackTranslationKey: 'errors.auth.currentUserFailed' }),
    };
  }
}

export async function restoreSession(): Promise<boolean> {
  try {
    const accessToken = await Storage.get(storageKey('access_token'));
    const refreshToken = await Storage.get(storageKey('refresh_token'));

    if (!accessToken && !refreshToken) {
      return false;
    }

    if (accessToken && !(await isAccessTokenExpired())) {
      const expiresAt = await Storage.get(storageKey('access_token_expires_at'));
      const refreshExpiresAt = await Storage.get(storageKey('refresh_token_expires_at'));
      const now = Date.now();

      setExternalToken({
        accessToken,
        refreshToken: refreshToken ?? '',
        expiresIn: expiresAt ? Math.max(0, Math.floor((parseInt(expiresAt, 10) - now) / 1000)) : 0,
        refreshExpiresIn: refreshExpiresAt
          ? Math.max(0, Math.floor((parseInt(refreshExpiresAt, 10) - now) / 1000))
          : 0,
      });

      return true;
    }

    if (!refreshToken) {
      return false;
    }

    const refreshResult = await refreshAccessToken();

    if (!refreshResult.success || !refreshResult.tokens) {
      return false;
    }

    setExternalToken(refreshResult.tokens);
    return true;
  } catch (error) {
    clearInMemoryAuthState();
    toAppError(error, { fallbackKind: 'unknown', fallbackTranslationKey: 'errors.global.unknown' });
    return false;
  }
}

export async function isSessionValid(): Promise<boolean> {
  if (collabApiClient.isConnected() === false) {
    return false;
  }

  try {
    await collabApiClient.getUser('me');
    return true;
  } catch (error) {
    toAppError(error, { fallbackKind: 'unknown', fallbackTranslationKey: 'errors.auth.currentUserFailed' });
    return false;
  }
}
