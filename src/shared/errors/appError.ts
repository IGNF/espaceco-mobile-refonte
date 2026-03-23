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

  let code: number | string | undefined;
  if (typeof errorLike.code === 'number' || typeof errorLike.code === 'string') {
    code = errorLike.code;
  } else if (responseData) {
    const dataCode = responseData.code;
    if (typeof dataCode === 'number' || typeof dataCode === 'string') {
      code = dataCode;
    }
  }

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
 * Normalizes any thrown value to an 'AppError'.
 */
export function toAppError(error: unknown, options: ToAppErrorOptions = {}): AppError {
  if (isAppError(error)) {
    return error;
  }

  const parsedError = parseError(error);
  const fallbackKind = options.fallbackKind ?? 'unknown';
  const inferredKind = inferAppErrorKind(parsedError);
  const resolvedKind = inferredKind === 'unknown' ? fallbackKind : inferredKind;
  const translationKey = options.fallbackTranslationKey ?? DEFAULT_TRANSLATION_KEYS[resolvedKind];

  const appError: AppError = new AppError({
    kind: resolvedKind,
    translationKey,
    message: parsedError.message,
    code: parsedError.code,
    retryable: options.retryable,
    cause: error,
  });

  console.error("In-app error detected", appError);

  return appError;
}
