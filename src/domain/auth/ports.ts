import type { AuthResult } from "./models";

/**
 * Interface for authentication services.
 * This allows swapping between password auth and OAuth + PKCE later.
 */
export interface IAuthService {
	login(email: string, password: string): Promise<AuthResult>;
	logout(): Promise<void>;
	getCurrentUser(): Promise<AuthResult>;
	isSessionValid(): Promise<boolean>;
}
