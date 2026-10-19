/**
 * Global error categories used across the application.
 */
export type AppErrorKind =
  | 'attachmentUploadFailed'
  | 'reportCreationFailed'
  | 'network'
  | 'unauthorized'
  | 'forbidden'
  | 'validation'
  | 'notFound'
  | 'conflict'
  | 'server'
  | 'unknown'
  | 'invalidParameter'

interface AppErrorOptions {
  kind: AppErrorKind;
  translationKey?: string;
  message?: string;
  code?: number | string;
  retryable?: boolean;
  cause?: unknown;
}

interface ToAppErrorOptions {
  fallbackKind?: AppErrorKind;
  fallbackTranslationKey?: string;
  retryable?: boolean;
}

/**
 * Default i18n keys per global error kind.
 * Features can override this at call site with 'fallbackTranslationKey'
 */
const DEFAULT_TRANSLATION_KEYS: Record<AppErrorKind, string> = {
  attachmentUploadFailed: 'reports.errors.submit.attachmentUploadFailed',
  reportCreationFailed: 'reports.errors.submit.reportCreationFailed',
  network: 'errors.global.network',
  unauthorized: 'errors.global.unauthorized',
  forbidden: 'errors.global.forbidden',
  validation: 'errors.global.validation',
  notFound: 'errors.global.notFound',
  conflict: 'errors.global.conflict',
  server: 'errors.global.server',
  unknown: 'errors.global.unknown',
  invalidParameter: 'errors.global.invalidParameter',
}

const RETRYABLE_KINDS = new Set<AppErrorKind>([
  'attachmentUploadFailed',
  'reportCreationFailed',
  'network',
  'server',
  'unknown',
])

const STATUS_TO_KIND: Record<number, AppErrorKind> = {
  400: 'validation',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'notFound',
  409: 'conflict',
}

/**
 * Codes raised by collaboratif-client-api (`ErrorCode`).
 * A recognized code selects both the kind and the user-facing translation.
 * The library message stays on `cause` for logs.
 */
const API_ERROR_CODE_MAP: Record<string, {
  kind: AppErrorKind;
  translationKey: string;
  retryable?: boolean;
}> = {
  BASE_URL_MISSING: {
    kind: 'unknown',
    translationKey: 'errors.api.baseUrlMissing',
    retryable: false,
  },
  CLIENT_ID_MISSING: {
    kind: 'unknown',
    translationKey: 'errors.api.clientIdMissing',
    retryable: false,
  },
  CLIENT_SECRET_MISSING: {
    kind: 'unknown',
    translationKey: 'errors.api.clientSecretMissing',
    retryable: false,
  },
  CLIENT_CONFIGURATION_ERROR: {
    kind: 'unknown',
    translationKey: 'errors.api.clientConfiguration',
    retryable: false,
  },
  ACCESS_TOKEN_MISSING: {
    kind: 'unauthorized',
    translationKey: 'errors.api.accessTokenMissing',
  },
  TOKEN_EXPIRED: {
    kind: 'unauthorized',
    translationKey: 'errors.global.unauthorized',
  },
  REFRESH_TOKEN_EXPIRED: {
    kind: 'unauthorized',
    translationKey: 'errors.auth.refreshTokenExpired',
  },
  ERROR_REFRESHING_ACCESS_TOKEN: {
    kind: 'unauthorized',
    translationKey: 'errors.auth.tokenRefreshFailed',
  },
  REFRESH_TOKEN_MISSING: {
    kind: 'unauthorized',
    translationKey: 'errors.auth.refreshTokenMissing',
  },
  INVALID_CREDENTIALS: {
    kind: 'unauthorized',
    translationKey: 'errors.auth.invalidCredentials',
  },
  CONN_ERROR: {
    kind: 'network',
    translationKey: 'errors.global.network',
  },
  UNAUTHORIZED: {
    kind: 'unauthorized',
    translationKey: 'errors.global.unauthorized',
  },
  VALIDATION_ERROR: {
    kind: 'validation',
    translationKey: 'errors.global.validation',
  },
  USER_ID_INVALID: {
    kind: 'validation',
    translationKey: 'errors.api.userIdInvalid',
  },
}

export function getApiErrorCodeMapping(code: unknown): {
  kind: AppErrorKind;
  translationKey: string;
  retryable?: boolean;
} | undefined {
  if (typeof code !== 'string') return undefined;
  return API_ERROR_CODE_MAP[code];
}

interface ErrorLike {
  code?: unknown;
  message?: unknown;
  response?: {
    status?: unknown;
    data?: unknown;
  };
}

function extractErrorLike(error: unknown): ErrorLike | null {
  if (!error || typeof error !== 'object') return null;
  return error as ErrorLike;
}

interface ParsedError {
  status?: number;
  code?: number | string;
  message?: string;
}

function parseError(error: unknown): ParsedError {
  const errorLike = extractErrorLike(error);
  if (!errorLike) return {};

  const status = typeof errorLike.response?.status === 'number'
    ? errorLike.response.status
    : undefined;

  const responseData = errorLike.response?.data && typeof errorLike.response.data === 'object'
    ? errorLike.response.data as { code?: unknown; message?: unknown }
    : undefined;

  const directCode = typeof errorLike.code === 'number' || typeof errorLike.code === 'string'
    ? errorLike.code
    : undefined;
  const dataCode = responseData && (typeof responseData.code === 'number' || typeof responseData.code === 'string')
    ? responseData.code
    : undefined;
  // A known API code wins over a transport code such as ERR_BAD_REQUEST.
  const code = getApiErrorCodeMapping(directCode)
    ? directCode
    : getApiErrorCodeMapping(dataCode)
      ? dataCode
      : directCode ?? dataCode;

  let message: string | undefined;
  if (responseData) {
    const dataMessage = responseData.message;
    if (typeof dataMessage === 'string' && dataMessage.trim().length > 0) {
      message = dataMessage;
    }
  }

  if (!message && typeof errorLike.message === 'string' && errorLike.message.trim().length > 0) {
    message = errorLike.message;
  }

  return {
    status,
    code,
    message,
  };
}

/**
 * Best-effort mapping from low-level transport/API details to a stable app kind.
 * When no deterministic mapping is available, this returns 'unknown'.
 */
function inferAppErrorKind(parsedError: ParsedError): AppErrorKind {
  if (parsedError.code === 'ERR_NETWORK') return 'network';
  if (typeof parsedError.status !== 'number') return 'unknown';
  if (parsedError.status >= 500) return 'server';
  return STATUS_TO_KIND[parsedError.status] ?? 'unknown';
}

/**
 * Canonical application error object.
 *
 * Rules:
 * - 'translationKey' is the source of truth for UI messages.
 * - 'message' is kept mainly for diagnostics/logging.
 * - 'kind' and 'retryable' are used by feature logic.
 */
export class AppError extends Error {
  readonly kind: AppErrorKind;
  readonly translationKey: string;
  readonly code?: number | string;
  readonly retryable: boolean;
  declare readonly cause?: unknown;

  constructor({
    kind,
    translationKey,
    message,
    code,
    retryable,
    cause,
  }: AppErrorOptions) {
    const resolvedTranslationKey = translationKey ?? DEFAULT_TRANSLATION_KEYS[kind];
    super(message ?? resolvedTranslationKey);
    this.name = 'AppError';
    this.kind = kind;
    this.translationKey = resolvedTranslationKey;
    this.code = code;
    this.retryable = retryable ?? RETRYABLE_KINDS.has(kind);
    this.cause = cause;
  }
}

/**
 * Type guard for unknown errors coming from async flows.
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Returns the i18n key to render to users for a given error.
 * Falls back to a caller-provided key if the value is not an 'AppError'.
 */
export function getAppErrorTranslationKey(
  error: unknown,
  fallbackKey: string = DEFAULT_TRANSLATION_KEYS.unknown
): string {
  return isAppError(error) ? error.translationKey : fallbackKey;
}

/**
 * Resolves the final user-facing error text from an app error and a translation function.
 * Keeps backend-provided messages when they differ from the translation key.
 */
export function getUserFacingErrorMessage(
  error: unknown,
  translate: (key: string) => string,
  fallbackKey: string = DEFAULT_TRANSLATION_KEYS.unknown
): string {
  return isAppError(error) && error.message && error.message !== error.translationKey
    ? error.message
    : translate(getAppErrorTranslationKey(error, fallbackKey));
}

/**
 * Normalizes any thrown value to an 'AppError'.
 */
export function toAppError(error: unknown, options: ToAppErrorOptions = {}): AppError {
  if (isAppError(error)) {
    return error;
  }

  const parsedError = parseError(error);
  const apiError = getApiErrorCodeMapping(parsedError.code);
  const fallbackKind = options.fallbackKind ?? 'unknown';
  const inferredKind = inferAppErrorKind(parsedError);
  const resolvedKind = apiError?.kind ?? (inferredKind === 'unknown' ? fallbackKind : inferredKind);
  const translationKey = apiError?.translationKey
    ?? options.fallbackTranslationKey
    ?? DEFAULT_TRANSLATION_KEYS[resolvedKind];

  const appError: AppError = new AppError({
    kind: resolvedKind,
    translationKey,
    // Known API codes carry an English library message. Keep it on `cause` only.
    message: apiError ? undefined : parsedError.message,
    code: parsedError.code,
    retryable: options.retryable ?? apiError?.retryable,
    cause: error,
  });

  console.error("In-app error detected", appError);

  return appError;
}
