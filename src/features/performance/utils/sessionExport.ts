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

function formatAxisTime(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.round(elapsedMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

interface ChartPoint {
  t: number;
  v: number;
}

function collectSeries(
  samples: PerformanceSample[],
  read: (sample: PerformanceSample) => number | null | undefined,
): ChartPoint[] {
  const points: ChartPoint[] = [];
  for (const sample of samples) {
    const value = read(sample);
    if (typeof value === 'number' && Number.isFinite(value)) {
      points.push({ t: sample.elapsedMs, v: value });
    }
  }
  return points;
}

function pickTickStepMs(durationMs: number): number {
  if (durationMs <= 60_000) {
    return 10_000;
  }
  if (durationMs <= 180_000) {
    return 20_000;
  }
  if (durationMs <= 600_000) {
    return 30_000;
  }
  return 60_000;
}

function chartSvg(
  title: string,
  samples: PerformanceSample[],
  read: (sample: PerformanceSample) => number | null | undefined,
  unit: string,
  markers: PerformanceSessionMeta['markers'],
): string {
  const series = collectSeries(samples, read);
  if (series.length < 2) {
    return `<section class="chart card"><h3>${escapeHtml(title)}</h3><p>Pas assez d'échantillons pour tracer une courbe.</p></section>`;
  }

  const padLeft = 52;
  const padRight = 16;
  const padTop = 12;
  const padBottom = 44;
  const plotWidth = 720;
  const plotHeight = 160;
  const width = padLeft + plotWidth + padRight;
  const height = padTop + plotHeight + padBottom;

  const min = Math.min(...series.map((point) => point.v));
  const max = Math.max(...series.map((point) => point.v));
  const span = max - min || 1;
  const t0 = series[0].t;
  const t1 = series[series.length - 1].t;
  const durationMs = Math.max(t1 - t0, 1);

  const xAt = (elapsedMs: number) => padLeft + ((elapsedMs - t0) / durationMs) * plotWidth;
  const yAt = (value: number) => padTop + plotHeight - ((value - min) / span) * plotHeight;

  const points = series
    .map((point) => `${xAt(point.t).toFixed(1)},${yAt(point.v).toFixed(1)}`)
    .join(' ');

  const tickStepMs = pickTickStepMs(durationMs);
  const ticks: number[] = [];
  const firstTick = Math.ceil(t0 / tickStepMs) * tickStepMs;
  for (let tick = firstTick; tick <= t1; tick += tickStepMs) {
    ticks.push(tick);
  }
  if (ticks[0] !== t0) {
    ticks.unshift(t0);
  }
  if (ticks[ticks.length - 1] !== t1) {
    ticks.push(t1);
  }

  const grid = ticks
    .map((tick) => {
      const x = xAt(tick).toFixed(1);
      return `<line class="grid" x1="${x}" y1="${padTop}" x2="${x}" y2="${padTop + plotHeight}" />`;
    })
    .join('');

  const axisLabels = ticks
    .map((tick) => {
      const x = xAt(tick).toFixed(1);
      const y = padTop + plotHeight + 18;
      return `<text class="tick" x="${x}" y="${y}" text-anchor="middle">${formatAxisTime(tick)}</text>`;
    })
    .join('');

  const markerLines = markers
    .filter((marker) => marker.elapsedMs >= t0 && marker.elapsedMs <= t1)
    .map((marker) => {
      const x = xAt(marker.elapsedMs).toFixed(1);
      return `
        <line class="marker" x1="${x}" y1="${padTop}" x2="${x}" y2="${padTop + plotHeight}" />
        <text class="marker-label" x="${x}" y="${padTop + 10}" text-anchor="middle">${escapeHtml(marker.label)}</text>
      `;
    })
    .join('');

  const seriesJson = JSON.stringify(series).replace(/</g, '\\u003c');

  return `
    <section class="chart card" data-unit="${escapeHtml(unit)}">
      <h3>${escapeHtml(title)}</h3>
      <p class="chart-range">${min.toFixed(1)} → ${max.toFixed(1)} ${escapeHtml(unit)} · survolez la courbe pour l'instant exact</p>
      <p class="chart-hover">t = — · valeur = —</p>
      <svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(title)}">
        ${grid}
        <line class="axis" x1="${padLeft}" y1="${padTop}" x2="${padLeft}" y2="${padTop + plotHeight}" />
        <line class="axis" x1="${padLeft}" y1="${padTop + plotHeight}" x2="${padLeft + plotWidth}" y2="${padTop + plotHeight}" />
        <text class="tick" x="${padLeft - 8}" y="${padTop + 4}" text-anchor="end">${max.toFixed(1)}</text>
        <text class="tick" x="${padLeft - 8}" y="${padTop + plotHeight}" text-anchor="end">${min.toFixed(1)}</text>
        <polyline class="line" fill="none" stroke="#26A581" stroke-width="2" points="${points}" />
        ${markerLines}
        ${axisLabels}
        <text class="axis-title" x="${padLeft + plotWidth / 2}" y="${height - 6}" text-anchor="middle">Temps écoulé depuis le début de la session (min:s)</text>
        <rect class="chart-hit" x="${padLeft}" y="${padTop}" width="${plotWidth}" height="${plotHeight}" fill="transparent" />
      </svg>
      <script type="application/json" class="chart-data">${seriesJson}</script>
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

  const cpuChart = chartSvg('CPU (%)', samples, (sample) => sample.cpu?.usagePercent ?? null, '%', session.markers);
  const memoryChart = chartSvg('Mémoire système (%)', samples, (sample) => sample.memory?.usedPercent, '%', session.markers);
  const appMemoryChart = chartSvg(
    'Mémoire application (Mo)',
    samples,
    (sample) => typeof sample.memory?.appUsedBytes === 'number' ? sample.memory.appUsedBytes / 1024 / 1024 : null,
    'Mo',
    session.markers,
  );
  const storageChart = chartSvg('Stockage (%)', samples, (sample) => sample.storage?.usedPercent, '%', session.markers);
  const cpuTempChart = chartSvg('Température CPU (°C)', samples, (sample) => sample.cpu?.temperatureCelsius, '°C', session.markers);
  const gpuTempChart = chartSvg('Température GPU (°C)', samples, (sample) => sample.gpu?.temperatureCelsius, '°C', session.markers);
  const batteryTempChart = chartSvg(
    'Température batterie (°C)',
    samples,
    (sample) => sample.sensors?.batteryTemperatureCelsius,
    '°C',
    session.markers,
  );

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
    svg.chart-svg { width: 100%; height: 240px; background: #f8fbfa; border-radius: 8px; }
    .muted { color: #6a727a; }
    .chart-range, .chart-hover { margin: 0 0 8px; font-size: 13px; color: #6a727a; }
    .chart-hover { font-variant-numeric: tabular-nums; color: #1c7b66; font-weight: 600; min-height: 1.2em; }
    .axis { stroke: #b8bcc1; stroke-width: 1; }
    .grid { stroke: #e9ecef; stroke-width: 1; }
    .tick { fill: #6a727a; font-size: 11px; font-family: system-ui, sans-serif; }
    .axis-title { fill: #6a727a; font-size: 11px; font-family: system-ui, sans-serif; }
    .marker { stroke: #f18345; stroke-width: 1.5; stroke-dasharray: 4 3; }
    .marker-label { fill: #a8592e; font-size: 10px; font-family: system-ui, sans-serif; }
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

  ${cpuChart}
  ${memoryChart}
  ${appMemoryChart}
  ${storageChart}
  ${cpuTempChart}
  ${gpuTempChart}
  ${batteryTempChart}

  <script type="application/json" id="performance-session-data">${payload}</script>
  <script>
    function formatTime(ms) {
      const totalSeconds = Math.max(0, Math.round(ms / 1000));
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return minutes + ':' + String(seconds).padStart(2, '0');
    }

    document.querySelectorAll('.chart').forEach((section) => {
      const svg = section.querySelector('.chart-svg');
      const hover = section.querySelector('.chart-hover');
      const dataNode = section.querySelector('.chart-data');
      const hit = section.querySelector('.chart-hit');
      if (!svg || !hover || !dataNode || !hit) return;

      const series = JSON.parse(dataNode.textContent || '[]');
      if (series.length < 2) return;

      const viewBox = (svg.getAttribute('viewBox') || '0 0 788 216').split(' ').map(Number);
      const padLeft = 52;
      const plotWidth = 720;
      const t0 = series[0].t;
      const durationMs = Math.max(series[series.length - 1].t - t0, 1);
      const unit = section.getAttribute('data-unit') || '';

      hit.addEventListener('mousemove', (event) => {
        const bounds = svg.getBoundingClientRect();
        const scaleX = viewBox[2] / bounds.width;
        const x = (event.clientX - bounds.left) * scaleX;
        const ratio = Math.min(1, Math.max(0, (x - padLeft) / plotWidth));
        const elapsed = t0 + ratio * durationMs;
        let nearest = series[0];
        let best = Math.abs(series[0].t - elapsed);
        for (const point of series) {
          const delta = Math.abs(point.t - elapsed);
          if (delta < best) {
            best = delta;
            nearest = point;
          }
        }
        hover.textContent = 't = ' + formatTime(nearest.t) + ' (' + Math.round(nearest.t / 1000) + ' s) · valeur = ' + nearest.v.toFixed(2) + ' ' + unit;
      });

      hit.addEventListener('mouseleave', () => {
        hover.textContent = 't = — · valeur = —';
      });
    });
  </script>
</body>
</html>`;
}
