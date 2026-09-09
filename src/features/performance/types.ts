import type { DeviceInfoUpdate } from '@/platform/device/deviceInfo';

export interface PerformanceDeviceMeta {
  name?: string;
  model?: string;
  manufacturer?: string;
  operatingSystem?: string;
  osVersion?: string;
  webViewVersion?: string;
}

export interface PerformanceMarker {
  timestamp: number;
  elapsedMs: number;
  sequence: number | null;
  label: string;
}

export interface PerformanceAppStateEvent {
  timestamp: number;
  elapsedMs: number;
  isActive: boolean;
}

export interface PerformanceSessionMeta {
  id: string;
  startedAt: number;
  endedAt: number | null;
  intervalMs: number;
  platform: 'ios' | 'android' | 'web' | string;
  pluginVersion: string;
  device: PerformanceDeviceMeta;
  scenario: string;
  notes: string;
  sampleCount: number;
  markers: PerformanceMarker[];
  appStateEvents: PerformanceAppStateEvent[];
}

export interface PerformanceSample extends DeviceInfoUpdate {
  appIsActive: boolean;
  marker?: string;
}

export interface PerformanceMonitorSnapshot {
  isReady: boolean;
  isMonitoring: boolean;
  isStarting: boolean;
  isExporting: boolean;
  intervalMs: number;
  scenario: string;
  notes: string;
  session: PerformanceSessionMeta | null;
  latestSample: PerformanceSample | null;
  liveSamples: PerformanceSample[];
  savedSessions: PerformanceSessionMeta[];
  errorMessage: string | null;
}

export interface StartPerformanceMonitoringOptions {
  intervalMs?: number;
  scenario?: string;
  notes?: string;
}
