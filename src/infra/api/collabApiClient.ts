import { ApiClient } from "collaboratif-client-api";
import { config } from "@/shared/config/env";
import { resolveOAuthTokenBaseUrl } from "@/infra/auth/oauthProxy";
import { clearServerOutage, reportServerOutage } from "@/shared/errors/serverOutageSignal";

type CollaborativeHttp = {
  interceptors: {
    response: {
      use: (
        onFulfilled: (response: { status?: number }) => unknown,
        onRejected: (error: unknown) => Promise<never>,
      ) => void;
    };
  };
};

function readStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object' || !('response' in error)) return undefined;
  const response = (error as { response?: { status?: unknown } }).response;
  return typeof response?.status === 'number' ? response.status : undefined;
}

/**
 * A shut down server often reaches the browser as a CORS failure.
 * Axios then reports a network error and no HTTP status.
 */
function isUnreachableApiError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const candidate = error as { code?: unknown; message?: unknown; response?: unknown };
  if (candidate.response || candidate.code === 'ERR_CANCELED') return false;
  if (candidate.code === 'ERR_NETWORK') return true;

  return candidate.message === 'Network Error';
}

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

const collaborativeHttp = (collabApiClient as ApiClient & { axiosInstance: CollaborativeHttp }).axiosInstance;

collaborativeHttp.interceptors.response.use(
  (response) => {
    if (typeof response.status === 'number' && response.status < 500) {
      clearServerOutage();
    }
    return response;
  },
  (error: unknown) => {
    const status = readStatus(error);
    if (status !== undefined && status >= 500) {
      reportServerOutage(status);
    } else if (status === undefined && isUnreachableApiError(error)) {
      reportServerOutage('network');
    }
    return Promise.reject(error);
  },
);
