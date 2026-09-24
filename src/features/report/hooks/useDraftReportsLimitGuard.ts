import { useRef, useState } from 'react';
import { ReportStatus } from '@ign/mobile-core';

import { ReportStorageAdapter } from '@/infra/storage';
import { MAX_DRAFT_REPORTS_BLOCK, MAX_DRAFT_REPORTS_WARNING } from '@/shared/constants/report';

const reportStorage = new ReportStorageAdapter();

export type DraftReportsLimitAlertType = 'warning' | 'error' | null;

export interface UseDraftReportsLimitGuardReturn {
  alertType: DraftReportsLimitAlertType;
  draftCount: number;
  requestCreate: (onProceed: () => void) => void;
  confirmWarning: () => void;
  dismissAlert: () => void;
}

async function countDraftReports(): Promise<number> {
  const reports = await reportStorage.listReports();
  return reports.filter((report) => report.status === ReportStatus.Draft).length;
}

export function useDraftReportsLimitGuard(): UseDraftReportsLimitGuardReturn {
  const [alertType, setAlertType] = useState<DraftReportsLimitAlertType>(null);
  const [draftCount, setDraftCount] = useState(0);
  const pendingProceedRef = useRef<(() => void) | null>(null);
  const isCheckingRef = useRef(false);

  const requestCreate = (onProceed: () => void) => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    void countDraftReports()
      .then((count) => {
        setDraftCount(count);

        if (count >= MAX_DRAFT_REPORTS_BLOCK) {
          setAlertType('error');
          return;
        }

        if (count >= MAX_DRAFT_REPORTS_WARNING) {
          pendingProceedRef.current = onProceed;
          setAlertType('warning');
          return;
        }

        onProceed();
      })
      .catch((error) => {
        console.error('[report] failed to count draft reports', error);
      })
      .finally(() => {
        isCheckingRef.current = false;
      });
  };

  const dismissAlert = () => {
    pendingProceedRef.current = null;
    setAlertType(null);
  };

  const confirmWarning = () => {
    const proceed = pendingProceedRef.current;
    pendingProceedRef.current = null;
    setAlertType(null);
    proceed?.();
  };

  return {
    alertType,
    draftCount,
    requestCreate,
    confirmWarning,
    dismissAlert,
  };
}
