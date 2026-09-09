import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/shared/ui/Button';
import { PageHeader } from '@/shared/ui/PageHeader';
import { SlideUpPage } from '@/shared/ui/SlideUpPage';
import { Toggle } from '@/shared/ui/Toggle';
import screen from '@/shared/styles/screen.module.css';
import inputs from '@/shared/styles/inputs.module.css';
import typography from '@/shared/styles/typography.module.css';

import { PERFORMANCE_INTERVAL_OPTIONS_MS } from '../constants';
import { MetricSparkline } from '../components/MetricSparkline';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';
import {
  formatBytes,
  formatCelsius,
  formatElapsed,
  formatHertz,
  formatNullable,
  formatPercent,
} from '../utils/formatMetrics';
import styles from './PerformanceMonitorPage.module.css';

export interface PerformanceMonitorPageProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PerformanceMonitorPage({ isOpen, onClose }: PerformanceMonitorPageProps) {
  const { t } = useTranslation();
  const {
    isMonitoring,
    isStarting,
    isExporting,
    intervalMs,
    scenario,
    notes,
    session,
    latestSample,
    liveSamples,
    savedSessions,
    errorMessage,
    start,
    stop,
    setScenario,
    setNotes,
    addMarker,
    exportSession,
    exportCurrentSession,
  } = usePerformanceMonitor();
  const [markerInput, setMarkerInput] = useState('');
  const [selectedIntervalMs, setSelectedIntervalMs] = useState(intervalMs);

  const elapsed = latestSample?.elapsedMs ?? 0;
  const sensors = latestSample?.sensors;

  const handleToggleMonitoring = async (checked: boolean) => {
    if (checked) {
      await start({ intervalMs: selectedIntervalMs, scenario, notes });
      return;
    }

    await stop();
  };

  const handleAddMarker = () => {
    addMarker(markerInput);
    setMarkerInput('');
  };

  return (
    <SlideUpPage isOpen={isOpen} onClose={onClose}>
      <PageHeader
        title={t('performance.title')}
        subtitle={t('performance.subtitle')}
        showBackButton
        onBack={onClose}
        onClose={onClose}
      />

      <main className={`${screen.screenContainer} ${styles.content}`}>
        <section className={styles.section}>
          <div className={styles.toggleRow}>
            <div>
              <h2 className={styles.sectionTitle}>{t('performance.recording.title')}</h2>
              <p className={`${typography.caption} ${styles.status}`}>
                {isMonitoring
                  ? t('performance.recording.active', {
                      count: session?.sampleCount ?? 0,
                      duration: formatElapsed(elapsed),
                    })
                  : t('performance.recording.inactive')}
              </p>
            </div>
            <Toggle
              checked={isMonitoring}
              disabled={isStarting}
              onChange={handleToggleMonitoring}
            />
          </div>

          <label className={inputs.field}>
            <span className={inputs.label}>{t('performance.interval')}</span>
            <select
              className={inputs.input}
              value={selectedIntervalMs}
              disabled={isMonitoring}
              onChange={(event) => setSelectedIntervalMs(Number(event.target.value))}
            >
              {PERFORMANCE_INTERVAL_OPTIONS_MS.map((value) => (
                <option key={value} value={value}>
                  {value} ms
                </option>
              ))}
            </select>
          </label>

          <label className={inputs.field}>
            <span className={inputs.label}>{t('performance.scenario')}</span>
            <input
              className={inputs.input}
              value={scenario}
              placeholder={t('performance.scenarioPlaceholder')}
              onChange={(event) => setScenario(event.target.value)}
            />
          </label>

          <label className={inputs.field}>
            <span className={inputs.label}>{t('performance.notes')}</span>
            <textarea
              className={`${inputs.input} ${styles.textarea}`}
              rows={3}
              value={notes}
              placeholder={t('performance.notesPlaceholder')}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>

          <div className={styles.markerRow}>
            <input
              className={inputs.input}
              value={markerInput}
              placeholder={t('performance.markerPlaceholder')}
              onChange={(event) => setMarkerInput(event.target.value)}
            />
            <Button
              color='secondary'
              className={styles.compactButton}
              onClick={handleAddMarker}
              disabled={!isMonitoring || markerInput.trim().length === 0}
            >
              {t('performance.addMarker')}
            </Button>
          </div>

          <Button
            color='primary'
            fullWidth
            loading={isExporting}
            disabled={!session && savedSessions.length === 0}
            onClick={() => void exportCurrentSession()}
          >
            {t('performance.exportCurrent')}
          </Button>

          {errorMessage && (
            <p className={`${inputs.error} ${styles.error}`}>{errorMessage}</p>
          )}
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('performance.hardware.title')}</h2>
          <dl className={styles.metrics}>
            <div><dt>{t('performance.hardware.platform')}</dt><dd>{formatNullable(latestSample?.platform ?? session?.platform)}</dd></div>
            <div><dt>{t('performance.hardware.device')}</dt><dd>{formatNullable([session?.device.manufacturer, session?.device.model].filter(Boolean).join(' '))}</dd></div>
            <div><dt>{t('performance.hardware.os')}</dt><dd>{formatNullable([session?.device.operatingSystem, session?.device.osVersion].filter(Boolean).join(' '))}</dd></div>
            <div><dt>{t('performance.hardware.cpu')}</dt><dd>{formatNullable(latestSample?.cpu?.model)}</dd></div>
            <div><dt>{t('performance.hardware.architecture')}</dt><dd>{formatNullable(latestSample?.cpu?.architecture)}</dd></div>
            <div><dt>{t('performance.hardware.cores')}</dt><dd>{formatNullable(latestSample?.cpu?.cores)}</dd></div>
            <div><dt>{t('performance.hardware.frequency')}</dt><dd>{formatHertz(latestSample?.cpu?.maxFrequencyHz)}</dd></div>
            <div><dt>{t('performance.hardware.gpu')}</dt><dd>{formatNullable([latestSample?.gpu?.vendor, latestSample?.gpu?.renderer].filter(Boolean).join(' '))}</dd></div>
            <div><dt>{t('performance.hardware.gpuApi')}</dt><dd>{formatNullable(latestSample?.gpu?.api)}</dd></div>
            <div><dt>{t('performance.hardware.plugin')}</dt><dd>{formatNullable(session?.pluginVersion)}</dd></div>
          </dl>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('performance.live.title')}</h2>
          <div className={styles.charts}>
            <MetricSparkline
              label={t('performance.live.cpu')}
              unit='%'
              current={formatPercent(latestSample?.cpu?.usagePercent ?? null)}
              values={liveSamples.map((sample) => sample.cpu?.usagePercent ?? null)}
            />
            <MetricSparkline
              label={t('performance.live.memory')}
              unit='%'
              current={formatPercent(latestSample?.memory?.usedPercent)}
              values={liveSamples.map((sample) => sample.memory?.usedPercent)}
            />
            <MetricSparkline
              label={t('performance.live.appMemory')}
              unit='Mo'
              current={formatBytes(latestSample?.memory?.appUsedBytes)}
              values={liveSamples.map((sample) =>
                typeof sample.memory?.appUsedBytes === 'number'
                  ? sample.memory.appUsedBytes / 1024 / 1024
                  : null,
              )}
            />
            <MetricSparkline
              label={t('performance.live.storage')}
              unit='%'
              current={formatPercent(latestSample?.storage?.usedPercent)}
              values={liveSamples.map((sample) => sample.storage?.usedPercent)}
            />
            <MetricSparkline
              label={t('performance.live.cpuTemp')}
              unit='°C'
              current={formatCelsius(latestSample?.cpu?.temperatureCelsius)}
              values={liveSamples.map((sample) => sample.cpu?.temperatureCelsius)}
            />
            <MetricSparkline
              label={t('performance.live.gpuTemp')}
              unit='°C'
              current={formatCelsius(latestSample?.gpu?.temperatureCelsius)}
              values={liveSamples.map((sample) => sample.gpu?.temperatureCelsius)}
            />
            <MetricSparkline
              label={t('performance.live.batteryTemp')}
              unit='°C'
              current={formatCelsius(sensors?.batteryTemperatureCelsius)}
              values={liveSamples.map((sample) => sample.sensors?.batteryTemperatureCelsius)}
            />
          </div>

          <dl className={styles.metrics}>
            <div><dt>{t('performance.live.thermal')}</dt><dd>{formatNullable(latestSample?.thermalState)}</dd></div>
            <div><dt>{t('performance.live.lowPower')}</dt><dd>{formatNullable(latestSample?.lowPowerMode)}</dd></div>
            <div><dt>{t('performance.live.lowMemory')}</dt><dd>{formatNullable(latestSample?.memory?.lowMemory)}</dd></div>
            <div><dt>{t('performance.live.pressure')}</dt><dd>{formatNullable(latestSample?.memory?.pressure)}</dd></div>
            <div><dt>{t('performance.live.memoryUsed')}</dt><dd>{formatBytes(latestSample?.memory?.usedBytes)}</dd></div>
            <div><dt>{t('performance.live.memoryFree')}</dt><dd>{formatBytes(latestSample?.memory?.freeBytes)}</dd></div>
            <div><dt>{t('performance.live.storageUsed')}</dt><dd>{formatBytes(latestSample?.storage?.usedBytes)}</dd></div>
            <div><dt>{t('performance.live.storageFree')}</dt><dd>{formatBytes(latestSample?.storage?.freeBytes)}</dd></div>
            <div><dt>{t('performance.live.humidity')}</dt><dd>{formatPercent(sensors?.relativeHumidityPercent)}</dd></div>
            <div><dt>{t('performance.live.pressureHpa')}</dt><dd>{formatNullable(sensors?.pressureHpa)}</dd></div>
            <div><dt>{t('performance.live.light')}</dt><dd>{formatNullable(sensors?.illuminanceLux)}</dd></div>
            <div><dt>{t('performance.live.proximity')}</dt><dd>{formatNullable(sensors?.proximityDistanceCm)}</dd></div>
            <div><dt>{t('performance.live.ambientTemp')}</dt><dd>{formatCelsius(sensors?.ambientTemperatureCelsius)}</dd></div>
            <div><dt>{t('performance.live.appActive')}</dt><dd>{formatNullable(latestSample?.appIsActive)}</dd></div>
          </dl>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('performance.sensors.title')}</h2>
          {sensors?.availableSensors && sensors.availableSensors.length > 0 ? (
            <ul className={styles.sensorList}>
              {sensors.availableSensors.map((sensor, index) => (
                <li key={`${sensor.type}-${sensor.name ?? index}`}>
                  <strong>{sensor.type}</strong>
                  {sensor.name ? ` · ${sensor.name}` : ''}
                  {sensor.vendor ? ` (${sensor.vendor})` : ''}
                </li>
              ))}
            </ul>
          ) : (
            <p className={typography.caption}>{t('performance.sensors.empty')}</p>
          )}
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('performance.sessions.title')}</h2>
          {savedSessions.length === 0 ? (
            <p className={typography.caption}>{t('performance.sessions.empty')}</p>
          ) : (
            <ul className={styles.sessionList}>
              {savedSessions.map((savedSession) => (
                <li key={savedSession.id} className={styles.sessionItem}>
                  <div>
                    <strong>{savedSession.scenario || savedSession.id}</strong>
                    <p className={typography.caption}>
                      {new Date(savedSession.startedAt).toLocaleString('fr-FR')}
                      {' · '}
                      {savedSession.sampleCount} {t('performance.sessions.samples')}
                    </p>
                  </div>
                  <Button
                    color='primary'
                    variant='outline'
                    className={styles.compactButton}
                    loading={isExporting}
                    onClick={() => void exportSession(savedSession.id)}
                  >
                    {t('performance.sessions.export')}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </SlideUpPage>
  );
}
