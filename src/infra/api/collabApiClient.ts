import { ApiClient } from "collaboratif-client-api";
import { config } from "@/shared/config/env";
import { resolveOAuthTokenBaseUrl } from "@/infra/auth/oauthProxy";

/**
 * Pre-configured API client for the collaboratif API.
 * On local web dev, token refresh goes through the same-origin SSO proxy.
 */
export const collabApiClient = new ApiClient(
	config.api.baseUrl,
	resolveOAuthTokenBaseUrl(),
	config.oAuth.clientId,
	null,
	{
		requestsPerSecond: 25,
		maxRetries: 3,
	},
);
