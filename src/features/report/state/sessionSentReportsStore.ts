import { useSyncExternalStore } from 'react';

import type { AppReport } from '@/domain/report/models';

type Listener = () => void;

const listeners = new Set<Listener>();
let sentReports: AppReport[] = [];

function emitChange(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): AppReport[] {
  return sentReports;
}

export function addSessionSentReport(report: AppReport): void {
  sentReports = [
    report,
    ...sentReports.filter((currentReport) => currentReport.id !== report.id),
  ];
  emitChange();
}

export function removeSessionSentReports(reportIds: number[]): void {
  sentReports = sentReports.filter((report) => !reportIds.includes(report.id));
  emitChange();
}

export function clearSessionSentReports(): void {
  sentReports = [];
  emitChange();
}

export function useSessionSentReports(): AppReport[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
