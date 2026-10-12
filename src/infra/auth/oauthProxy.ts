import { Capacitor } from '@capacitor/core';

import { config } from '@/shared/config/env';

/** Same-origin prefix proxied by the Vite dev server. */
export const OAUTH_WEB_PROXY_PREFIX = '/__sso';

/** Key read by AuthManager when exchanging the authorization code. */
export const OAUTH_CODE_VERIFIER_KEY = 'temp_code_verifier';

export function ssoBaseUrl(): string {
  return config.oAuth.baseUrl.replace(/\/$/, '');
}

/**
 * Local web dev only. Native builds and production web keep calling Keycloak directly.
 * `vite build --mode development` also sets DEV, but the device WebView is native.
 */
export function usesWebOAuthProxy(): boolean {
  return import.meta.env.DEV && !Capacitor.isNativePlatform();
}

function oauthWebProxyPath(): string {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${basePath}${OAUTH_WEB_PROXY_PREFIX}`;
}

/** Base URL for /token and /revoke. */
export function resolveOAuthTokenBaseUrl(): string {
  if (!usesWebOAuthProxy()) {
    return ssoBaseUrl();
  }

  const proxyPath = oauthWebProxyPath();
  if (typeof window !== 'undefined' && window.location.origin) {
    return `${window.location.origin}${proxyPath}`;
  }

  return proxyPath;
}
