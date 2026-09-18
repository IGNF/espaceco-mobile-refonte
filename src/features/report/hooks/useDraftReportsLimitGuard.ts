import { useRef, useState } from 'react';

import { useMyReports } from '@/features/report/hooks/useMyReports';
import { MAX_DRAFT_REPORTS_BLOCK, MAX_DRAFT_REPORTS_WARNING } from '@/shared/constants/report';

export type DraftReportsLimitAlertType = 'warning' | 'error' | null;

export interface UseDraftReportsLimitGuardReturn {
  alertType: DraftReportsLimitAlertType;
  draftCount: number;
  requestCreate: (onProceed: () => void) => void;
  confirmWarning: () => void;
  dismissAlert: () => void;
}

export function useDraftReportsLimitGuard(): UseDraftReportsLimitGuardReturn {
  const { draftReports } = useMyReports();
  const [alertType, setAlertType] = useState<DraftReportsLimitAlertType>(null);
  const pendingProceedRef = useRef<(() => void) | null>(null);

  const requestCreate = (onProceed: () => void) => {
    const draftCount = draftReports.length;

    if (draftCount > MAX_DRAFT_REPORTS_BLOCK) {
      setAlertType('error');
      return;
    }

    if (draftCount > MAX_DRAFT_REPORTS_WARNING) {
      pendingProceedRef.current = onProceed;
      setAlertType('warning');
      return;
    }

    onProceed();
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
    draftCount: draftReports.length,
    requestCreate,
    confirmWarning,
    dismissAlert,
  };
}
