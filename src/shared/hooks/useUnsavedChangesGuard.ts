import { useCallback, useState } from 'react';

type LeaveDestination = 'close' | 'back';

export interface UseUnsavedChangesGuardOptions {
  hasUnsavedChanges: boolean;
  onClose: () => void;
  onBack?: () => void;
  beforeLeave?: () => void;
}

export interface UseUnsavedChangesGuardReturn {
  isLeaveAlertOpen: boolean;
  requestClose: () => void;
  requestBack: () => void;
  confirmLeave: () => void;
  cancelLeave: () => void;
}

export function useUnsavedChangesGuard({
  hasUnsavedChanges,
  onClose,
  onBack,
  beforeLeave,
}: UseUnsavedChangesGuardOptions): UseUnsavedChangesGuardReturn {
  const [pendingDestination, setPendingDestination] = useState<LeaveDestination | null>(null);

  const leaveNow = useCallback((destination: LeaveDestination) => {
    beforeLeave?.();

    if (destination === 'back' && onBack) {
      onBack();
      return;
    }

    onClose();
  }, [beforeLeave, onBack, onClose]);

  const requestLeave = useCallback((destination: LeaveDestination) => {
    if (hasUnsavedChanges) {
      setPendingDestination(destination);
      return;
    }

    leaveNow(destination);
  }, [hasUnsavedChanges, leaveNow]);

  const requestClose = useCallback(() => {
    requestLeave('close');
  }, [requestLeave]);

  const requestBack = useCallback(() => {
    requestLeave('back');
  }, [requestLeave]);

  const cancelLeave = useCallback(() => {
    setPendingDestination(null);
  }, []);

  const confirmLeave = useCallback(() => {
    if (!pendingDestination) return;

    const destination = pendingDestination;
    setPendingDestination(null);
    leaveNow(destination);
  }, [leaveNow, pendingDestination]);

  return {
    isLeaveAlertOpen: pendingDestination !== null,
    requestClose,
    requestBack,
    confirmLeave,
    cancelLeave,
  };
}
