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

// Main configuration object
export const config: Config = {
	environment: useQualification ? "qualification" : "production",
	isQualification: useQualification,
	isProduction: !useQualification,

	api: {
		baseUrl: env.VITE_BASE_API_URL || "https://espacecollaboratif.ign.fr/api/",
	},

	auth: useQualification ? qualificationAuth : productionAuth,

	app: {
		name: env.VITE_APPLI_NAME || "Espace collaboratif IGN",
		id: env.VITE_APPLI_ID || "fr.ign.guichet",
		type: (env.VITE_APPLI as AppType) || "EspaceCo",
		secret: env.VITE_SECRET || "",
	},
};