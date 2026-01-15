export interface ApiResponse<T> {
	data: T;
	status: number;
}

export interface ApiError {
	message: string;
	status: number;
	code?: string;
}

export class ApiRequestError extends Error {
	status: number;
	code?: string;

	constructor(message: string, status: number, code?: string) {
		super(message);
		this.name = "ApiRequestError";
		this.status = status;
		this.code = code;
	}
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface RequestOptions {
	headers?: Record<string, string>;
	params?: Record<string, string | number | boolean | undefined>;
	skipAuth?: boolean;
}
