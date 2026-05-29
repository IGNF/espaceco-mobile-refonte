import { useEffect, useSyncExternalStore } from 'react';
import { Storage } from '@ign/mobile-device';

import type { AppReport } from '@/domain/report/models';
import { storageKey } from '@/shared/constants/storage';

type Listener = () => void;

const SESSION_SENT_REPORTS_KEY = 'SESSION_SENT_REPORTS';
const listeners = new Set<Listener>();
let sentReports: AppReport[] = [];
let hasLoadedSentReports = false;

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

function serializeReport(report: AppReport): Record<string, unknown> {
  return {
    ...report,
    createdAt: report.createdAt instanceof Date ? report.createdAt.toISOString() : report.createdAt,
    modifiedAt: report.modifiedAt instanceof Date ? report.modifiedAt.toISOString() : report.modifiedAt,
    closingDate: report.closingDate instanceof Date ? report.closingDate.toISOString() : report.closingDate,
  };
}

function deserializeReport(report: AppReport): AppReport {
  return {
    ...report,
    createdAt: new Date(report.createdAt),
    modifiedAt: report.modifiedAt ? new Date(report.modifiedAt) : undefined,
    closingDate: report.closingDate ? new Date(report.closingDate) : undefined,
  };
}

async function persistSentReports(): Promise<void> {
  await Storage.set(
    storageKey(SESSION_SENT_REPORTS_KEY),
    sentReports.map(serializeReport),
    'object'
  );
}

async function loadSentReports(): Promise<void> {
  if (hasLoadedSentReports) return;

  const storedReports = await Storage.get(storageKey(SESSION_SENT_REPORTS_KEY), 'object');
  sentReports = ((storedReports as AppReport[] | null) ?? []).map(deserializeReport);
  hasLoadedSentReports = true;
  emitChange();
}

export async function addSessionSentReport(report: AppReport): Promise<void> {
  sentReports = [
    report,
    ...sentReports.filter((currentReport) => currentReport.id !== report.id),
  ];
  await persistSentReports();
  emitChange();
}

export async function removeSessionSentReports(reportIds: number[]): Promise<void> {
  sentReports = sentReports.filter((report) => !reportIds.includes(report.id));
  await persistSentReports();
  emitChange();
}

export async function clearSessionSentReports(): Promise<void> {
  sentReports = [];
  hasLoadedSentReports = true;
  await Storage.remove(storageKey(SESSION_SENT_REPORTS_KEY));
  emitChange();
}

export function useSessionSentReports(): AppReport[] {
  useEffect(() => {
    void loadSentReports();
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
