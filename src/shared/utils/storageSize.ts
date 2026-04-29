export function formatSizeFromBytes(sizeBytes: number): string {
  return `${(sizeBytes / 1024 / 1024).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} Mo`;
}

export function formatSizeFromMb(sizeMb: number | null): string {
  if (sizeMb === null) return '-';

  if (sizeMb >= 1024) {
    return `${(sizeMb / 1024).toLocaleString('fr-FR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })} Go`;
  }

  return `${sizeMb.toLocaleString('fr-FR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} Mo`;
}
