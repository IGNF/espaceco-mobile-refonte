import type { PerformanceSample, PerformanceSessionMeta } from '../types';

function csvEscape(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  const text = String(value);
  if (/[",\n;]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

const CSV_COLUMNS: Array<{
  key: string;
  read: (sample: PerformanceSample) => string | number | boolean | null | undefined;
}> = [
  { key: 'sequence', read: (sample) => sample.sequence },
  { key: 'timestamp', read: (sample) => sample.timestamp },
  { key: 'isoTime', read: (sample) => new Date(sample.timestamp).toISOString() },
  { key: 'elapsedMs', read: (sample) => sample.elapsedMs },
  { key: 'platform', read: (sample) => sample.platform },
  { key: 'appIsActive', read: (sample) => sample.appIsActive },
  { key: 'marker', read: (sample) => sample.marker ?? '' },
  { key: 'cpu.cores', read: (sample) => sample.cpu?.cores },
  { key: 'cpu.activeCores', read: (sample) => sample.cpu?.activeCores },
  { key: 'cpu.architecture', read: (sample) => sample.cpu?.architecture },
  { key: 'cpu.model', read: (sample) => sample.cpu?.model },
  { key: 'cpu.usagePercent', read: (sample) => sample.cpu?.usagePercent },
  { key: 'cpu.maxFrequencyHz', read: (sample) => sample.cpu?.maxFrequencyHz },
  { key: 'cpu.temperatureCelsius', read: (sample) => sample.cpu?.temperatureCelsius },
  { key: 'memory.totalBytes', read: (sample) => sample.memory?.totalBytes },
  { key: 'memory.freeBytes', read: (sample) => sample.memory?.freeBytes },
  { key: 'memory.usedBytes', read: (sample) => sample.memory?.usedBytes },
  { key: 'memory.usedPercent', read: (sample) => sample.memory?.usedPercent },
  { key: 'memory.appUsedBytes', read: (sample) => sample.memory?.appUsedBytes },
  { key: 'memory.appLimitBytes', read: (sample) => sample.memory?.appLimitBytes },
  { key: 'memory.lowMemory', read: (sample) => sample.memory?.lowMemory },
  { key: 'memory.pressure', read: (sample) => sample.memory?.pressure },
  { key: 'storage.totalBytes', read: (sample) => sample.storage?.totalBytes },
  { key: 'storage.freeBytes', read: (sample) => sample.storage?.freeBytes },
  { key: 'storage.usedBytes', read: (sample) => sample.storage?.usedBytes },
  { key: 'storage.usedPercent', read: (sample) => sample.storage?.usedPercent },
  { key: 'gpu.api', read: (sample) => sample.gpu?.api },
  { key: 'gpu.vendor', read: (sample) => sample.gpu?.vendor },
  { key: 'gpu.renderer', read: (sample) => sample.gpu?.renderer },
  { key: 'gpu.version', read: (sample) => sample.gpu?.version },
  { key: 'gpu.maxTextureSize', read: (sample) => sample.gpu?.maxTextureSize },
  { key: 'gpu.temperatureCelsius', read: (sample) => sample.gpu?.temperatureCelsius },
  { key: 'thermalState', read: (sample) => sample.thermalState },
  { key: 'lowPowerMode', read: (sample) => sample.lowPowerMode },
  { key: 'sensors.batteryTemperatureCelsius', read: (sample) => sample.sensors?.batteryTemperatureCelsius },
  { key: 'sensors.ambientTemperatureCelsius', read: (sample) => sample.sensors?.ambientTemperatureCelsius },
  { key: 'sensors.relativeHumidityPercent', read: (sample) => sample.sensors?.relativeHumidityPercent },
  { key: 'sensors.pressureHpa', read: (sample) => sample.sensors?.pressureHpa },
  { key: 'sensors.illuminanceLux', read: (sample) => sample.sensors?.illuminanceLux },
  { key: 'sensors.proximityDistanceCm', read: (sample) => sample.sensors?.proximityDistanceCm },
  { key: 'sensors.readingsJson', read: (sample) => JSON.stringify(sample.sensors?.readings ?? []) },
];

export function samplesToCsv(samples: PerformanceSample[]): string {
  const header = CSV_COLUMNS.map((column) => column.key).join(',');
  const rows = samples.map((sample) =>
    CSV_COLUMNS.map((column) => csvEscape(column.read(sample))).join(','),
  );

  return `\uFEFF${[header, ...rows].join('\n')}`;
}

interface MetricStats {
  label: string;
  unit: string;
  min: number | null;
  avg: number | null;
  max: number | null;
  last: number | null;
}

function collectNumbers(samples: PerformanceSample[], read: (sample: PerformanceSample) => number | null | undefined): number[] {
  return samples
    .map(read)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
}

function buildStats(
  label: string,
  unit: string,
  samples: PerformanceSample[],
  read: (sample: PerformanceSample) => number | null | undefined,
): MetricStats {
  const values = collectNumbers(samples, read);
  if (values.length === 0) {
    return { label, unit, min: null, avg: null, max: null, last: null };
  }

  const sum = values.reduce((total, value) => total + value, 0);
  return {
    label,
    unit,
    min: Math.min(...values),
    avg: sum / values.length,
    max: Math.max(...values),
    last: values[values.length - 1] ?? null,
  };
}

function countBy<T extends string>(values: T[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) {
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}

export interface PerformanceSessionSummary {
  stats: MetricStats[];
  thermalCounts: Record<string, number>;
  lowPowerSampleCount: number;
  lowMemorySampleCount: number;
  backgroundSampleCount: number;
}

export function summarizeSession(samples: PerformanceSample[]): PerformanceSessionSummary {
  return {
    stats: [
      buildStats('CPU', '%', samples, (sample) => sample.cpu?.usagePercent ?? null),
      buildStats('Mémoire système', '%', samples, (sample) => sample.memory?.usedPercent),
      buildStats('Mémoire app', 'Mo', samples, (sample) =>
        typeof sample.memory?.appUsedBytes === 'number' ? sample.memory.appUsedBytes / 1024 / 1024 : null,
      ),
      buildStats('Stockage', '%', samples, (sample) => sample.storage?.usedPercent),
      buildStats('Température CPU', '°C', samples, (sample) => sample.cpu?.temperatureCelsius),
      buildStats('Température GPU', '°C', samples, (sample) => sample.gpu?.temperatureCelsius),
      buildStats('Température batterie', '°C', samples, (sample) => sample.sensors?.batteryTemperatureCelsius),
    ],
    thermalCounts: countBy(
      samples
        .map((sample) => sample.thermalState)
        .filter((value): value is NonNullable<typeof value> => typeof value === 'string'),
    ),
    lowPowerSampleCount: samples.filter((sample) => sample.lowPowerMode === true).length,
    lowMemorySampleCount: samples.filter((sample) => sample.memory?.lowMemory === true).length,
    backgroundSampleCount: samples.filter((sample) => sample.appIsActive === false).length,
  };
}

function formatStat(value: number | null, digits = 1): string {
  if (value === null) {
    return 'n/d';
  }

  return value.toFixed(digits);
}

function polylinePoints(values: number[], width: number, height: number): string {
  if (values.length === 0) {
    return '';
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  return values
    .map((value, index) => {
      const x = values.length === 1 ? 0 : (index / (values.length - 1)) * width;
      const y = height - ((value - min) / span) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

function chartSvg(title: string, values: number[], unit: string): string {
  if (values.length < 2) {
    return `<section class="chart"><h3>${title}</h3><p>Pas assez d'échantillons pour tracer une courbe.</p></section>`;
  }

  const width = 720;
  const height = 160;
  const points = polylinePoints(values, width, height);
  const min = Math.min(...values);
  const max = Math.max(...values);

  return `
    <section class="chart">
      <h3>${title}</h3>
      <p class="chart-range">${min.toFixed(1)} → ${max.toFixed(1)} ${unit}</p>
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}">
        <polyline fill="none" stroke="#26A581" stroke-width="2" points="${points}" />
      </svg>
    </section>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildSessionHtmlReport(
  session: PerformanceSessionMeta,
  samples: PerformanceSample[],
): string {
  const summary = summarizeSession(samples);
  const firstSample = samples[0];
  const hardwareRows = [
    ['Plateforme', session.platform],
    ['Appareil', [session.device.manufacturer, session.device.model].filter(Boolean).join(' ') || 'n/d'],
    ['OS', [session.device.operatingSystem, session.device.osVersion].filter(Boolean).join(' ') || 'n/d'],
    ['CPU', firstSample?.cpu?.model ?? 'n/d'],
    ['Architecture', firstSample?.cpu?.architecture ?? 'n/d'],
    ['Cœurs', firstSample?.cpu?.cores ?? 'n/d'],
    ['GPU', [firstSample?.gpu?.vendor, firstSample?.gpu?.renderer].filter(Boolean).join(' ') || 'n/d'],
    ['API GPU', firstSample?.gpu?.api ?? 'n/d'],
    ['Plugin', session.pluginVersion],
  ];

  const statsRows = summary.stats
    .map((stat) => `
      <tr>
        <td>${escapeHtml(stat.label)}</td>
        <td>${formatStat(stat.min)} ${stat.unit}</td>
        <td>${formatStat(stat.avg)} ${stat.unit}</td>
        <td>${formatStat(stat.max)} ${stat.unit}</td>
        <td>${formatStat(stat.last)} ${stat.unit}</td>
      </tr>
    `)
    .join('');

  const markerRows = session.markers.length === 0
    ? '<tr><td colspan="3">Aucun marqueur</td></tr>'
    : session.markers
      .map((marker) => `
        <tr>
          <td>${new Date(marker.timestamp).toISOString()}</td>
          <td>${marker.elapsedMs} ms</td>
          <td>${escapeHtml(marker.label)}</td>
        </tr>
      `)
      .join('');

  const thermalRows = Object.entries(summary.thermalCounts)
    .map(([state, count]) => `<tr><td>${escapeHtml(state)}</td><td>${count}</td></tr>`)
    .join('') || '<tr><td colspan="2">n/d</td></tr>';

  const cpuValues = collectNumbers(samples, (sample) => sample.cpu?.usagePercent ?? null);
  const memoryValues = collectNumbers(samples, (sample) => sample.memory?.usedPercent);
  const appMemoryValues = collectNumbers(samples, (sample) =>
    typeof sample.memory?.appUsedBytes === 'number' ? sample.memory.appUsedBytes / 1024 / 1024 : null,
  );
  const storageValues = collectNumbers(samples, (sample) => sample.storage?.usedPercent);
  const cpuTempValues = collectNumbers(samples, (sample) => sample.cpu?.temperatureCelsius);
  const gpuTempValues = collectNumbers(samples, (sample) => sample.gpu?.temperatureCelsius);
  const batteryTempValues = collectNumbers(samples, (sample) => sample.sensors?.batteryTemperatureCelsius);

  const payload = JSON.stringify({ session, samples }).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>EspaceCo — session ${escapeHtml(session.id)}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 24px; color: #091625; background: #f4f6f8; }
    h1, h2, h3 { color: #1c7b66; }
    .card { background: #fff; border-radius: 12px; padding: 16px 20px; margin-bottom: 16px; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 8px 6px; border-bottom: 1px solid #dde1e6; font-size: 14px; }
    svg { width: 100%; height: 160px; background: #f8fbfa; border-radius: 8px; }
    .muted { color: #6a727a; }
    .chart-range { margin: 0 0 8px; font-size: 13px; color: #6a727a; }
  </style>
</head>
<body>
  <h1>Rapport de monitoring EspaceCo</h1>
  <p class="muted">Généré pour documentation produit — plugin @capgo/capacitor-device-info</p>

  <section class="card">
    <h2>Session</h2>
    <p><strong>Id :</strong> ${escapeHtml(session.id)}</p>
    <p><strong>Scénario :</strong> ${escapeHtml(session.scenario || 'non renseigné')}</p>
    <p><strong>Notes :</strong> ${escapeHtml(session.notes || '—')}</p>
    <p><strong>Début :</strong> ${new Date(session.startedAt).toISOString()}</p>
    <p><strong>Fin :</strong> ${session.endedAt ? new Date(session.endedAt).toISOString() : 'en cours'}</p>
    <p><strong>Intervalle :</strong> ${session.intervalMs} ms · <strong>Échantillons :</strong> ${samples.length}</p>
    <p><strong>Low power :</strong> ${summary.lowPowerSampleCount} échantillons · <strong>Low memory :</strong> ${summary.lowMemorySampleCount} · <strong>Arrière-plan :</strong> ${summary.backgroundSampleCount}</p>
  </section>

  <section class="card">
    <h2>Matériel</h2>
    <table>
      ${hardwareRows.map(([label, value]) => `<tr><th>${label}</th><td>${escapeHtml(String(value))}</td></tr>`).join('')}
    </table>
  </section>

  <section class="card">
    <h2>Statistiques</h2>
    <table>
      <thead><tr><th>Métrique</th><th>Min</th><th>Moyenne</th><th>Max</th><th>Dernier</th></tr></thead>
      <tbody>${statsRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>État thermique</h2>
    <table>
      <thead><tr><th>État</th><th>Échantillons</th></tr></thead>
      <tbody>${thermalRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Marqueurs de scénario</h2>
    <table>
      <thead><tr><th>Horodatage</th><th>Écoulé</th><th>Libellé</th></tr></thead>
      <tbody>${markerRows}</tbody>
    </table>
  </section>

  ${chartSvg('CPU (%)', cpuValues, '%')}
  ${chartSvg('Mémoire système (%)', memoryValues, '%')}
  ${chartSvg('Mémoire application (Mo)', appMemoryValues, 'Mo')}
  ${chartSvg('Stockage (%)', storageValues, '%')}
  ${chartSvg('Température CPU (°C)', cpuTempValues, '°C')}
  ${chartSvg('Température GPU (°C)', gpuTempValues, '°C')}
  ${chartSvg('Température batterie (°C)', batteryTempValues, '°C')}

  <script type="application/json" id="performance-session-data">${payload}</script>
</body>
</html>`;
}
