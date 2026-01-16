/**
 * Type declarations for collaboratif-client-api package.
 * This package doesn't ship with TypeScript types.
 */
declare module "collaboratif-client-api" {
	import type { AxiosResponse } from "axios";

	/**
	 * Authentication client for OAuth2 password grant with Keycloak
	 */
	export class AuthClient {
		constructor(baseUrl: string, clientId: string, clientSecret: string);
		getBaseUrl(): string;
		isTokenExpired(): boolean;
		isTokenRefreshExpired(): boolean;
		setExpirationDates(tokenExpiresIn: number, refreshTokenExpiresIn: number): void;
		processTokenResponse(response: Record<string, unknown>): void;
		getPrimaryToken(credentials: { username: string; password: string }): Promise<AxiosResponse>;
		getRefreshToken(): Promise<AxiosResponse>;
		fetchToken(credentials: { username: string; password: string }): Promise<string>;
		disconnect(): Promise<void>;
		token: string | null;
		refreshToken: string | null;
		started: boolean;
	}

	/**
	 * Main API client for collaboratif API
	 */
	export class ApiClient {
		constructor(
			apiBaseUrl: string,
			authBaseUrl?: string | null,
			clientId?: string | null,
			clientSecret?: string | null
		);

		// Configuration
		setBaseUrl(baseUrl: string): boolean;
		getBaseUrl(): string;
		setAuthParams(authBaseUrl: string, clientId: string, clientSecret: string): boolean;

		// Authentication
		setCredentials(username: string, password: string, encrypted?: boolean): void;
		disconnect(): void;
		isConnected(): boolean | null;

		// Generic request
		doRequest<T = unknown>(
			url: string,
			method: string,
			body?: Record<string, unknown> | null,
			params?: Record<string, unknown> | null,
			contentType?: string
		): Promise<AxiosResponse<T>>;

		getDocument(url: string): Promise<AxiosResponse<ArrayBuffer>>;

		// Users
		getUsers(parameters?: Record<string, unknown>): Promise<AxiosResponse>;
		getUser(id?: number | "me", parameters?: Record<string, unknown>): Promise<AxiosResponse>;
		patchUser(id: number, body?: Record<string, unknown>, contentType?: string): Promise<AxiosResponse>;
		deleteUser(id: number): Promise<AxiosResponse>;

		// Databases
		getDatabases(parameters?: Record<string, unknown>): Promise<AxiosResponse>;
		getDatabase(id: number, parameters?: Record<string, unknown>): Promise<AxiosResponse>;
		addDatabase(body: Record<string, unknown>, contentType?: string): Promise<AxiosResponse>;
		putDatabase(id: number, body: Record<string, unknown>, contentType?: string): Promise<AxiosResponse>;
		patchDatabase(id: number, body: Record<string, unknown>, contentType?: string): Promise<AxiosResponse>;
		deleteDatabase(id: number): Promise<AxiosResponse>;

		// Communities
		getCommunities(parameters?: Record<string, unknown>): Promise<AxiosResponse>;
		getCommunity(id: number, parameters?: Record<string, unknown>): Promise<AxiosResponse>;
		addCommunity(body: Record<string, unknown>, contentType?: string): Promise<AxiosResponse>;
		putCommunity(id: number, body: Record<string, unknown>, contentType?: string): Promise<AxiosResponse>;
		patchCommunity(id: number, body: Record<string, unknown>, contentType?: string): Promise<AxiosResponse>;
		deleteCommunity(id: number): Promise<AxiosResponse>;

		// Permissions
		getPermissions(parameters?: Record<string, unknown>): Promise<AxiosResponse>;
		getPermission(id: number, parameters?: Record<string, unknown>): Promise<AxiosResponse>;
		addPermission(body: Record<string, unknown>, contentType?: string): Promise<AxiosResponse>;
		putPermission(id: number, body: Record<string, unknown>, contentType?: string): Promise<AxiosResponse>;
		patchPermission(id: number, body: Record<string, unknown>, contentType?: string): Promise<AxiosResponse>;
		deletePermission(id: number): Promise<AxiosResponse>;

		// Geoservices
		getGeoservices(parameters?: Record<string, unknown>): Promise<AxiosResponse>;
		getGeoservice(id: number, parameters?: Record<string, unknown>): Promise<AxiosResponse>;
		addGeoservice(body: Record<string, unknown>, contentType?: string): Promise<AxiosResponse>;
		putGeoservice(id: number, body: Record<string, unknown>, contentType?: string): Promise<AxiosResponse>;
		patchGeoservice(id: number, body: Record<string, unknown>, contentType?: string): Promise<AxiosResponse>;
		deleteGeoservice(id: number): Promise<AxiosResponse>;

		// Reports
		getReports(parameters?: Record<string, unknown>): Promise<AxiosResponse>;
		getReport(id: number, parameters?: Record<string, unknown>): Promise<AxiosResponse>;
		addReport(body: Record<string, unknown>): Promise<AxiosResponse>;
		putReport(id: number, body: Record<string, unknown>): Promise<AxiosResponse>;
		patchReport(id: number, body: Record<string, unknown>): Promise<AxiosResponse>;
		deleteReport(id: number): Promise<AxiosResponse>;
		addAttachments(reportId: number, body: Record<string, unknown>): Promise<AxiosResponse>;
		addReply(reportId: number, body: Record<string, unknown>, contentType?: string): Promise<AxiosResponse>;

		// Layers
		getLayers(communityId: number, parameters?: Record<string, unknown>): Promise<AxiosResponse>;
		getLayer(communityId: number, id: number, parameters?: Record<string, unknown>): Promise<AxiosResponse>;
		addLayer(communityId: number, body: Record<string, unknown>, contentType?: string): Promise<AxiosResponse>;
		putLayer(communityId: number, id: number, body: Record<string, unknown>, contentType?: string): Promise<AxiosResponse>;
		patchLayer(communityId: number, id: number, body: Record<string, unknown>, contentType?: string): Promise<AxiosResponse>;
		deleteLayer(communityId: number, id: number): Promise<AxiosResponse>;

		// Transactions
		getTransactions(databaseId: number, parameters?: Record<string, unknown>): Promise<AxiosResponse>;
		getTransaction(databaseId: number, id: number, parameters?: Record<string, unknown>): Promise<AxiosResponse>;
		addTransaction(databaseId: number, body: Record<string, unknown>, contentType?: string): Promise<AxiosResponse>;

		// Tables
		getTables(databaseId: number, parameters?: Record<string, unknown>): Promise<AxiosResponse>;
		getTable(databaseId: number, id: number, parameters?: Record<string, unknown>): Promise<AxiosResponse>;
		getTableMaxNumrec(databaseId: number, id: number, parameters?: Record<string, unknown>): Promise<AxiosResponse>;
		addTable(databaseId: number, body: Record<string, unknown>, contentType?: string): Promise<AxiosResponse>;
		putTable(databaseId: number, id: number, body: Record<string, unknown>, contentType?: string): Promise<AxiosResponse>;
		patchTable(databaseId: number, id: number, body: Record<string, unknown>, contentType?: string): Promise<AxiosResponse>;
		deleteTable(databaseId: number, id: number): Promise<AxiosResponse>;

		// Columns
		getColumns(databaseId: number, tableId: number, parameters?: Record<string, unknown>): Promise<AxiosResponse>;
		getColumn(databaseId: number, tableId: number, id: number, parameters?: Record<string, unknown>): Promise<AxiosResponse>;
		addColumn(databaseId: number, tableId: number, body: Record<string, unknown>, contentType?: string): Promise<AxiosResponse>;
		putColumn(databaseId: number, tableId: number, id: number, body: Record<string, unknown>, contentType?: string): Promise<AxiosResponse>;
		patchColumn(databaseId: number, tableId: number, id: number, body: Record<string, unknown>, contentType?: string): Promise<AxiosResponse>;
		deleteColumn(databaseId: number, tableId: number, id: number): Promise<AxiosResponse>;

		// Features
		getFeatures(databaseId: number, tableId: number, parameters?: Record<string, unknown>): Promise<AxiosResponse>;
		getFeature(databaseId: number, tableId: number, id: number, parameters?: Record<string, unknown>): Promise<AxiosResponse>;
		addFeature(databaseId: number, tableId: number, body: Record<string, unknown>, contentType?: string): Promise<AxiosResponse>;
		patchFeature(databaseId: number, tableId: number, id: number, body: Record<string, unknown>, contentType?: string): Promise<AxiosResponse>;
		deleteFeature(databaseId: number, tableId: number, id: number): Promise<AxiosResponse>;

		// Members
		getMembers(communityId: number, parameters?: Record<string, unknown>): Promise<AxiosResponse>;
		getMember(communityId: number, id: number, parameters?: Record<string, unknown>): Promise<AxiosResponse>;
		addMember(communityId: number, body: Record<string, unknown>, contentType?: string): Promise<AxiosResponse>;
		putMember(communityId: number, id: number, body: Record<string, unknown>, contentType?: string): Promise<AxiosResponse>;
		patchMember(communityId: number, id: number, body: Record<string, unknown>, contentType?: string): Promise<AxiosResponse>;
		deleteMember(communityId: number, id: number): Promise<AxiosResponse>;
	}
}
