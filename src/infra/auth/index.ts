export {
  loginWithPassword,
  loginWithOAuth,
  handleOAuthCallback,
  logout,
  getCurrentUser,
  isSessionValid,
  refreshAccessToken,
  isAccessTokenExpired,
  getStoredAccessToken,
} from "./authService";

export type { AuthResult, RefreshResult } from "./authService";
