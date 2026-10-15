import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { APP_LOADING_TIMEOUT_MS } from '@/shared/constants/map';
import { showToastSafe } from '@/shared/utils/toast';

interface UseInitialAppLoadingOptions {
  isMapReady: boolean;
  hasInitialCenterCompleted: boolean;
  hasInitialLocationAttemptSettled: boolean;
  isAppDataLoading: boolean;
  isEnabled?: boolean;
  timeoutMs?: number;
  settleMs?: number;
}

interface UseInitialAppLoadingResult {
  showInitialLoadingOverlay: boolean;
}

const DEFAULT_SETTLE_MS = 400;

export function useInitialAppLoading({
  isMapReady,
  hasInitialCenterCompleted,
  hasInitialLocationAttemptSettled,
  isAppDataLoading,
  isEnabled = true,
  timeoutMs = APP_LOADING_TIMEOUT_MS,
  settleMs = DEFAULT_SETTLE_MS,
}: UseInitialAppLoadingOptions): UseInitialAppLoadingResult {
  const { t } = useTranslation();
  const [isInitialLoadingComplete, setIsInitialLoadingComplete] = useState(false);
  const [hasInitialLoadingTimedOut, setHasInitialLoadingTimedOut] = useState(false);
  const [isSkipped, setIsSkipped] = useState(false);

  if (!isEnabled && !isSkipped) {
    setIsSkipped(true);
  }

  useEffect(() => {
    if (isSkipped || isInitialLoadingComplete || hasInitialLoadingTimedOut) return;

    const hasFinishedLoading =
      isMapReady &&
      hasInitialLocationAttemptSettled &&
      (!hasInitialCenterCompleted || !isAppDataLoading);
    if (!hasFinishedLoading) return;

    const settleTimeoutId = window.setTimeout(() => {
      setIsInitialLoadingComplete(true);
    }, settleMs);

    return () => {
      window.clearTimeout(settleTimeoutId);
    };
  }, [
    hasInitialLoadingTimedOut,
    hasInitialCenterCompleted,
    hasInitialLocationAttemptSettled,
    isInitialLoadingComplete,
    isAppDataLoading,
    isMapReady,
    isSkipped,
    settleMs,
  ]);

  useEffect(() => {
    if (isSkipped || isInitialLoadingComplete || hasInitialLoadingTimedOut) return;

    const timeoutId = window.setTimeout(() => {
      setHasInitialLoadingTimedOut(true);
      void showToastSafe({
        text: t('home.loading.timeoutError'),
        duration: 'short',
        position: 'top',
      });
    }, timeoutMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [hasInitialLoadingTimedOut, isInitialLoadingComplete, isSkipped, t, timeoutMs]);

  return {
    showInitialLoadingOverlay: !isSkipped && !isInitialLoadingComplete && !hasInitialLoadingTimedOut,
  };
}
