export const STORAGE_PREFIX = 'ESPACE_CO';

export function storageKey(key: string): string {
  return `${STORAGE_PREFIX}_${key}`;
}
