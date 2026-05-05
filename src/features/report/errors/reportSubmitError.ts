import type { AppErrorKind } from '@/shared/errors/appError';
import { AppError, toAppError } from '@/shared/errors/appError';

/**
 * Report-specific submit error categories.
 * This extends global categories with report domain states
 */
export type ReportSubmitErrorKind =
  | 'attachmentUploadFailed'
  | 'reportCreationFailed'
  | 'network'
  | 'unauthorized'
  | 'forbidden'
  | 'validation'
  | 'unknown'
  | 'invalidParameter'

interface ReportSubmitErrorOptions {
  kind: ReportSubmitErrorKind;
  message?: string;
  translationKey?: string;
  code?: number | string;
  retryable?: boolean;
  cause?: unknown;
}

/**
 * Default i18n keys for report submit errors.
 * UI should render these keys instead of using 'Error.message'.
 */
const DEFAULT_TRANSLATION_KEYS: Record<ReportSubmitErrorKind, string> = {
  attachmentUploadFailed: 'reports.errors.submit.attachmentUploadFailed',
  reportCreationFailed: 'reports.errors.submit.reportCreationFailed',
  network: 'reports.errors.submit.network',
  unauthorized: 'reports.errors.submit.unauthorized',
  forbidden: 'reports.errors.submit.forbidden',
  validation: 'reports.errors.submit.validation',
  unknown: 'reports.errors.submit.unknown',
  invalidParameter: 'reports.errors.submit.invalidParameter',
}

const RETRYABLE_KINDS = new Set<ReportSubmitErrorKind>([
  'attachmentUploadFailed',
  'reportCreationFailed',
  'network',
  'unknown',
])

function toReportSubmitKind(kind: AppErrorKind): ReportSubmitErrorKind {
  if (kind === 'notFound' || kind === 'conflict' || kind === 'server') {
    return 'unknown';
  }

  return kind;
}

/**
 * Report domain error that still behaves as a global 'AppError'.
 *
 * 'kind' is used for both report submit behavior and global handling.
 */
export class ReportSubmitError extends AppError {
  constructor({ kind, message, translationKey, code, retryable, cause }: ReportSubmitErrorOptions) {
    const resolvedTranslationKey = translationKey ?? DEFAULT_TRANSLATION_KEYS[kind];
    super({
      kind,
      translationKey: resolvedTranslationKey,
      message,
      code,
      retryable: retryable ?? RETRYABLE_KINDS.has(kind),
      cause,
    });
    this.name = 'ReportSubmitError';
  }
}

/**
 * Type guard for report submit errors.
 */
export function isReportSubmitError(error: unknown): error is ReportSubmitError {
  return error instanceof ReportSubmitError;
}

/**
 * Returns the translation key for report submit errors.
 * Falls back to a provided key when error is unknown.
 */
export function getReportSubmitErrorTranslationKey(
  error: unknown,
  fallbackKey: string = DEFAULT_TRANSLATION_KEYS.unknown
): string {
  if (!isReportSubmitError(error)) {
    return fallbackKey;
  }

  return error.translationKey;
}

/**
 * Converts unknown thrown values into 'ReportSubmitError'.
 *
 * Flow:
 * 1) Normalize to 'AppError' to reuse shared transport/API classification.
 * 2) Map back to a report-level kind for report workflow decisions.
 */
export function toReportSubmitError(
  error: unknown,
  fallbackKind: ReportSubmitErrorKind = 'unknown'
): ReportSubmitError {
  if (isReportSubmitError(error)) {
    return error;
  }

  const appError = toAppError(error, {
    fallbackKind,
    fallbackTranslationKey: DEFAULT_TRANSLATION_KEYS[fallbackKind],
  });
  const kind = toReportSubmitKind(appError.kind);

  return new ReportSubmitError({
    kind,
    code: appError.code,
    message: appError.message,
    translationKey: DEFAULT_TRANSLATION_KEYS[kind],
    cause: error,
    retryable: appError.retryable,
  });
}
