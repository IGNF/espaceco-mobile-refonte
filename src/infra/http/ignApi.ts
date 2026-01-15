import { authSessionStore } from "@/infra/auth/authSessionStore";
import { config } from "@/shared/config/env";
import { ApiRequestError, type ApiResponse, type HttpMethod, type RequestOptions } from "./types";

export { ApiRequestError, type ApiResponse, type ApiError, type RequestOptions } from "./types";

function buildUrl(endpoint: string, params?: RequestOptions["params"]): string {
	const url = new URL(endpoint, config.api.baseUrl);

	if (params) {
		Object.entries(params).forEach(([key, value]) => {
			if (value !== undefined) {
				url.searchParams.append(key, String(value));
			}
		});
	}

	return url.toString();
}

async function request<T>(
	method: HttpMethod,
	endpoint: string,
	body?: unknown,
	options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  console.log("API request", method, endpoint, body, options);
  
	const { headers = {}, params, skipAuth = false } = options;

	const requestHeaders: Record<string, string> = {
		"Content-Type": "application/json",
		...headers,
	};

	if (!skipAuth) {
		const token = await authSessionStore.getAccessToken();
		if (token) {
			requestHeaders["Authorization"] = `Bearer ${token}`;
		}
	}

	const url = buildUrl(endpoint, params);
  console.log("API url", url);

	const response = await fetch(url, {
		method,
		headers: requestHeaders,
		body: body ? JSON.stringify(body) : undefined,
	});
  console.log("API response", response);

	if (!response.ok) {
		let errorMessage = "An error occurred";
		let errorCode: string | undefined;

		try {
			const errorBody = await response.json();
			errorMessage = errorBody.message || errorBody.error || errorMessage;
			errorCode = errorBody.code;
		} catch {
			errorMessage = response.statusText || errorMessage;
		}

		// Handle 401 - token might be expired
		if (response.status === 401 && !skipAuth) {
			await authSessionStore.clear();
      // should display a message to the user and redirect them to the login again?
		}

		throw new ApiRequestError(errorMessage, response.status, errorCode);
	}

	const data = await response.json();
	return { data, status: response.status };
}

export const ignApi = {
	get<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
		return request<T>("GET", endpoint, undefined, options);
	},

	post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
		return request<T>("POST", endpoint, body, options);
	},

	put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
		return request<T>("PUT", endpoint, body, options);
	},

	patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
		return request<T>("PATCH", endpoint, body, options);
	},

	delete<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
		return request<T>("DELETE", endpoint, undefined, options);
	},
};
