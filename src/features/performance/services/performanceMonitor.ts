import { App } from '@capacitor/app';
import { Device } from '@capacitor/device';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { EmailComposer } from 'capacitor-email-composer';
import type { PluginListenerHandle } from '@capacitor/core';

import { EspaceCo_DeviceInfo, type DeviceInfoUpdate } from '@/platform/device/deviceInfo';

import {
  PERFORMANCE_LIVE_SAMPLE_LIMIT,
  PERFORMANCE_MIN_INTERVAL_MS,
  PERFORMANCE_SAMPLE_INTERVAL_MS,
  PERFORMANCE_SESSION_DIRECTORY,
} from '../constants';
import type {
  PerformanceDeviceMeta,
  PerformanceMonitorSnapshot,
  PerformanceSample,
  PerformanceSessionMeta,
  StartPerformanceMonitoringOptions,
} from '../types';
import { buildSessionHtmlReport, samplesToCsv } from '../utils/sessionExport';

type Listener = () => void;

function createSessionId(date = new Date()): string {
  return date.toISOString().replaceAll(':', '-').replaceAll('.', '-');
}

function sessionBasePath(sessionId: string): string {
  return `${PERFORMANCE_SESSION_DIRECTORY}/${sessionId}`;
}

export class PerformanceMonitor {
  private listeners = new Set<Listener>();
  private pluginListener: PluginListenerHandle | null = null;
  private appStateHandle: PluginListenerHandle | null = null;
  private writeQueue: Promise<void> = Promise.resolve();

  private isReady = false;
  private isMonitoring = false;
  private isStarting = false;
  private isExporting = false;
  private intervalMs = PERFORMANCE_SAMPLE_INTERVAL_MS;
  private scenario = '';
  private notes = '';
  private session: PerformanceSessionMeta | null = null;
  private latestSample: PerformanceSample | null = null;
  private liveSamples: PerformanceSample[] = [];
  private savedSessions: PerformanceSessionMeta[] = [];
  private errorMessage: string | null = null;
  private appIsActive = true;
  private pendingMarker: string | null = null;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot(): PerformanceMonitorSnapshot {
    return {
      isReady: this.isReady,
      isMonitoring: this.isMonitoring,
      isStarting: this.isStarting,
      isExporting: this.isExporting,
      intervalMs: this.intervalMs,
      scenario: this.scenario,
      notes: this.notes,
      session: this.session,
      latestSample: this.latestSample,
      liveSamples: this.liveSamples,
      savedSessions: this.savedSessions,
      errorMessage: this.errorMessage,
    };
  }

  setScenario(scenario: string): void {
    this.scenario = scenario;
    if (this.session) {
      this.session = { ...this.session, scenario };
      this.persistMeta(this.session);
    }
    this.emit();
  }

  setNotes(notes: string): void {
    this.notes = notes;
    if (this.session) {
      this.session = { ...this.session, notes };
      this.persistMeta(this.session);
    }
    this.emit();
  }

  async init(): Promise<void> {
    if (this.isReady) {
      return;
    }

    try {
      await Filesystem.mkdir({
        path: PERFORMANCE_SESSION_DIRECTORY,
        directory: Directory.Data,
        recursive: true,
      });
    } catch {
      // Directory may already exist.
    }

    this.savedSessions = await this.readSavedSessions();
    this.isReady = true;
    this.emit();
  }

  async start(options: StartPerformanceMonitoringOptions = {}): Promise<void> {
    if (this.isStarting) {
      return;
    }

    this.isStarting = true;
    this.errorMessage = null;
    this.emit();

    try {
      await this.init();

      if (this.isMonitoring) {
        await this.stop();
      }

      const intervalMs = Math.max(
        PERFORMANCE_MIN_INTERVAL_MS,
        options.intervalMs ?? this.intervalMs,
      );
      this.intervalMs = intervalMs;
      this.scenario = options.scenario ?? this.scenario;
      this.notes = options.notes ?? this.notes;

      const startedAt = Date.now();
      const sessionId = createSessionId(new Date(startedAt));
      const [pluginVersion, device] = await Promise.all([
        EspaceCo_DeviceInfo.getPluginVersion().catch(() => 'unknown'),
        this.readDeviceMeta(),
      ]);

      this.session = {
        id: sessionId,
        startedAt,
        endedAt: null,
        intervalMs,
        platform: device.operatingSystem ?? 'unknown',
        pluginVersion,
        device,
        scenario: this.scenario,
        notes: this.notes,
        sampleCount: 0,
        markers: [],
        appStateEvents: [],
      };
      this.latestSample = null;
      this.liveSamples = [];
      this.pendingMarker = null;

      this.persistMeta(this.session);
      await this.flushWrites();

      this.pluginListener = await EspaceCo_DeviceInfo.addUpdateListener((update) => {
        this.handleSample(update);
      });

      if (!this.appStateHandle) {
        this.appStateHandle = await App.addListener('appStateChange', ({ isActive }) => {
          this.handleAppStateChange(isActive);
        });
      }

      await EspaceCo_DeviceInfo.startMonitoring({
        intervalMs,
        emitImmediately: true,
      });

      this.isMonitoring = true;
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Impossible de démarrer le monitoring.';
      this.isMonitoring = false;
    } finally {
      this.isStarting = false;
      this.emit();
    }
  }

  async stop(): Promise<void> {
    if (!this.isMonitoring && !this.pluginListener) {
      return;
    }

    try {
      await EspaceCo_DeviceInfo.stopMonitoring();
    } catch {
      // Native monitoring may already be stopped.
    }

    if (this.pluginListener) {
      await this.pluginListener.remove();
      this.pluginListener = null;
    }

    if (this.session) {
      const endedSession: PerformanceSessionMeta = {
        ...this.session,
        endedAt: Date.now(),
        sampleCount: this.session.sampleCount,
      };
      this.session = endedSession;
      await this.flushWrites();
      await this.persistMeta(endedSession);
      this.savedSessions = await this.readSavedSessions();
    }

    this.isMonitoring = false;
    this.emit();
  }

  addMarker(label: string): void {
    const trimmed = label.trim();
    if (!trimmed || !this.session) {
      return;
    }

    this.pendingMarker = trimmed;
    this.session = {
      ...this.session,
      markers: [
        ...this.session.markers,
        {
          timestamp: Date.now(),
          elapsedMs: this.latestSample?.elapsedMs ?? Date.now() - this.session.startedAt,
          sequence: this.latestSample?.sequence ?? null,
          label: trimmed,
        },
      ],
    };
    this.persistMeta(this.session);
    this.emit();
  }

  async exportCurrentSession(): Promise<void> {
    const session = this.session ?? this.savedSessions[0];
    if (!session) {
      this.errorMessage = 'Aucune session à exporter.';
      this.emit();
      return;
    }

    await this.exportSession(session.id);
  }

  async exportSession(sessionId: string): Promise<void> {
    this.isExporting = true;
    this.errorMessage = null;
    this.emit();

    try {
      await this.flushWrites();
      const session = await this.readSessionMeta(sessionId);
      const samples = await this.readSessionSamples(sessionId);
      if (!session) {
        throw new Error('Métadonnées de session introuvables.');
      }

      const json = JSON.stringify({ session, samples }, null, 2);
      const csv = samplesToCsv(samples);
      const html = buildSessionHtmlReport(session, samples);
      const prefix = `espaceco-perf-${sessionId}`;

      await this.emailFiles([
        { filename: `${prefix}.html`, data: html },
        { filename: `${prefix}.csv`, data: csv },
        { filename: `${prefix}.json`, data: json },
      ], `EspaceCo performance ${sessionId}`);
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : "L'export a échoué.";
    } finally {
      this.isExporting = false;
      this.emit();
    }
  }

  private handleSample(update: DeviceInfoUpdate): void {
    if (!this.session) {
      return;
    }

    const marker = this.pendingMarker ?? undefined;
    this.pendingMarker = null;

    const sample: PerformanceSample = {
      ...update,
      appIsActive: this.appIsActive,
      marker,
    };

    this.latestSample = sample;
    this.liveSamples = [...this.liveSamples, sample].slice(-PERFORMANCE_LIVE_SAMPLE_LIMIT);
    this.session = {
      ...this.session,
      sampleCount: this.session.sampleCount + 1,
      platform: update.platform,
    };

    const sessionId = this.session.id;
    this.enqueueWrite(async () => {
      await Filesystem.appendFile({
        path: `${sessionBasePath(sessionId)}.jsonl`,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
        data: `${JSON.stringify(sample)}\n`,
      });
    });

    if (this.session.sampleCount === 1 || this.session.sampleCount % 10 === 0) {
      this.persistMeta(this.session);
    }

    this.emit();
  }

  private handleAppStateChange(isActive: boolean): void {
    this.appIsActive = isActive;
    if (!this.session) {
      return;
    }

    this.session = {
      ...this.session,
      appStateEvents: [
        ...this.session.appStateEvents,
        {
          timestamp: Date.now(),
          elapsedMs: Date.now() - this.session.startedAt,
          isActive,
        },
      ],
    };
    this.persistMeta(this.session);
    this.emit();
  }

  private persistMeta(session: PerformanceSessionMeta): void {
    this.enqueueWrite(async () => {
      await Filesystem.writeFile({
        path: `${sessionBasePath(session.id)}.meta.json`,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
        data: JSON.stringify(session, null, 2),
        recursive: true,
      });
    });
  }

  private enqueueWrite(task: () => Promise<void>): void {
    this.writeQueue = this.writeQueue
      .then(task)
      .catch((error) => {
        console.warn('[PerformanceMonitor] write failed', error);
      });
  }

  private async flushWrites(): Promise<void> {
    await this.writeQueue;
  }

  private async readDeviceMeta(): Promise<PerformanceDeviceMeta> {
    try {
      const info = await Device.getInfo();
      return {
        name: info.name,
        model: info.model,
        manufacturer: info.manufacturer,
        operatingSystem: info.operatingSystem,
        osVersion: info.osVersion,
        webViewVersion: info.webViewVersion,
      };
    } catch {
      return {};
    }
  }

  private async readSavedSessions(): Promise<PerformanceSessionMeta[]> {
    try {
      const listing = await Filesystem.readdir({
        path: PERFORMANCE_SESSION_DIRECTORY,
        directory: Directory.Data,
      });

      const metaFiles = listing.files
        .map((entry) => entry.name)
        .filter((name) => name.endsWith('.meta.json'))
        .sort()
        .reverse();

      const sessions: PerformanceSessionMeta[] = [];
      for (const name of metaFiles) {
        const sessionId = name.replace(/\.meta\.json$/, '');
        const session = await this.readSessionMeta(sessionId);
        if (session) {
          sessions.push(session);
        }
      }
      return sessions;
    } catch {
      return [];
    }
  }

  private async readSessionMeta(sessionId: string): Promise<PerformanceSessionMeta | null> {
    try {
      const result = await Filesystem.readFile({
        path: `${sessionBasePath(sessionId)}.meta.json`,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });
      return JSON.parse(String(result.data)) as PerformanceSessionMeta;
    } catch {
      return null;
    }
  }

  private async readSessionSamples(sessionId: string): Promise<PerformanceSample[]> {
    try {
      const result = await Filesystem.readFile({
        path: `${sessionBasePath(sessionId)}.jsonl`,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });
      return String(result.data)
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => JSON.parse(line) as PerformanceSample);
    } catch {
      return [];
    }
  }

  private async emailFiles(
    files: Array<{ filename: string; data: string }>,
    subject: string,
  ): Promise<void> {
    const attachments = [];

    for (const file of files) {
      const path = `performance-export/${file.filename}`;
      await Filesystem.writeFile({
        path,
        data: file.data,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
        recursive: true,
      });
      const { uri } = await Filesystem.getUri({
        path,
        directory: Directory.Cache,
      });
      attachments.push({
        type: 'absolute' as const,
        path: uri.replace(/^file:\/\//i, ''),
        name: file.filename,
      });
    }

    await EmailComposer.open({
      subject,
      attachments,
    });
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const performanceMonitor = new PerformanceMonitor();
