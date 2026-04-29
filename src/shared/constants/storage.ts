export const STORAGE_PREFIX = 'ESPACE_CO';
export const ONLINE_VECTOR_CACHE_TTL_MS = 5 * 60 * 1000;

export function storageKey(key: string): string {
  return `${STORAGE_PREFIX}_${key}`;
}
