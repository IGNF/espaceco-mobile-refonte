import { ApiClient } from "collaboratif-client-api";
import { config } from "@/shared/config/env";

/**
 * Pre-configured API client for the collaboratif API
 */
export const collabApiClient = new ApiClient(
	config.api.baseUrl,
	config.oAuth.baseUrl,
	config.oAuth.clientId,
);
