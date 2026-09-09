export function formatPercent(value: number | null | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '—';
  }

  return `${value.toFixed(1)} %`;
}

export function formatCelsius(value: number | null | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '—';
  }

  return `${value.toFixed(1)} °C`;
}

export function formatBytes(value: number | null | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '—';
  }

  const megabytes = value / 1024 / 1024;
  if (megabytes >= 1024) {
    return `${(megabytes / 1024).toFixed(2)} Go`;
  }

  return `${megabytes.toFixed(1)} Mo`;
}

export function formatHertz(value: number | null | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '—';
  }

  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)} GHz`;
  }

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(0)} MHz`;
  }

  return `${value} Hz`;
}

export function formatElapsed(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  }

  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

export function formatNullable(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  if (typeof value === 'boolean') {
    return value ? 'oui' : 'non';
  }

  return String(value);
}
