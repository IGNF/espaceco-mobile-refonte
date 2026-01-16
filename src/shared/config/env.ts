/**
 * Centralized environment configuration.
 */

const env = import.meta.env;

type AppType = "EspaceCo" | "NaviForest";
type Environment = "production" | "qualification";

interface AuthConfig {
	clientId: string;
	clientSecret: string;
	baseUrl: string;
}

interface OAuthConfig {
	clientId: string;
  baseUrl: string;
	androidRedirectUri: string;
  iosRedirectUri: string;
}

interface ApiConfig {
	baseUrl: string;
}

interface AppConfig {
	name: string;
	id: string;
	type: AppType;
	secret: string;
}

interface Config {
	environment: Environment;
	api: ApiConfig;
	auth: AuthConfig;
	oAuth: OAuthConfig;
	app: AppConfig;
	isQualification: boolean;
	isProduction: boolean;
}

const useQualification = env.VITE_USE_QUALIF === "true";

// Production authentication configuration
const productionAuth: AuthConfig = {
	clientId: env.VITE_COLLAB_API_CLIENT_ID || "",
	clientSecret: env.VITE_COLLAB_API_CLIENT_SECRET || "",
	baseUrl: env.VITE_BASE_AUTH_URL || "",
};

// Qualification authentication configuration
const qualificationAuth: AuthConfig = {
	clientId: env.VITE_QLF_COLLAB_API_CLIENT_ID || "",
	clientSecret: env.VITE_QLF_COLLAB_API_CLIENT_SECRET || "",
	baseUrl: env.VITE_QLF_BASE_AUTH_URL || "",
};

const oAuthConfig: OAuthConfig = {
	clientId: env.VITE_OAUTH_CLIENT_ID || "",
	baseUrl: env.VITE_OAUTH_BASE_URL || "",
	androidRedirectUri: env.VITE_OAUTH_ANDROID_REDIRECT_URI || "",
	iosRedirectUri: env.VITE_OAUTH_IOS_REDIRECT_URI || "",
};

// Main configuration object
export const config: Config = {
	environment: useQualification ? "qualification" : "production",
	isQualification: useQualification,
	isProduction: !useQualification,

	api: {
		baseUrl: env.VITE_BASE_API_URL || "https://espacecollaboratif.ign.fr/api/",
	},

	auth: useQualification ? qualificationAuth : productionAuth,
	oAuth: oAuthConfig,
	app: {
		name: env.VITE_APPLI_NAME || "Espace collaboratif IGN",
		id: env.VITE_APPLI_ID || "fr.ign.guichet",
		type: (env.VITE_APPLI as AppType) || "EspaceCo",
		secret: env.VITE_SECRET || "",
	},
};