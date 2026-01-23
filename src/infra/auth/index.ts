export {
  loginWithPassword,
  loginWithOAuth,
  handleOAuthCallback,
  logout,
  getCurrentUser,
  restoreSession,
  isSessionValid,
  refreshAccessToken,
  isAccessTokenExpired,
  getStoredAccessToken,
} from "./authService";

export type { AuthResult, RefreshResult } from "./authService";
