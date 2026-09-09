import { useEffect, useState } from 'react';

import { performanceMonitor } from '../services/performanceMonitor';
import type { PerformanceMonitorSnapshot, StartPerformanceMonitoringOptions } from '../types';

export function usePerformanceMonitor(): PerformanceMonitorSnapshot & {
  start: (options?: StartPerformanceMonitoringOptions) => Promise<void>;
  stop: () => Promise<void>;
  setScenario: (scenario: string) => void;
  setNotes: (notes: string) => void;
  addMarker: (label: string) => void;
  exportSession: (sessionId: string) => Promise<void>;
  exportCurrentSession: () => Promise<void>;
} {
  const [snapshot, setSnapshot] = useState<PerformanceMonitorSnapshot>(() => performanceMonitor.getSnapshot());

  useEffect(() => {
    void performanceMonitor.init();
    return performanceMonitor.subscribe(() => {
      setSnapshot(performanceMonitor.getSnapshot());
    });
  }, []);

  return {
    ...snapshot,
    start: (options) => performanceMonitor.start(options),
    stop: () => performanceMonitor.stop(),
    setScenario: (scenario) => performanceMonitor.setScenario(scenario),
    setNotes: (notes) => performanceMonitor.setNotes(notes),
    addMarker: (label) => performanceMonitor.addMarker(label),
    exportSession: (sessionId) => performanceMonitor.exportSession(sessionId),
    exportCurrentSession: () => performanceMonitor.exportCurrentSession(),
  };
}
