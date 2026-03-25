import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { APP_LOADING_TIMEOUT_MS } from '@/shared/constants/map';
import { showToastSafe } from '@/shared/utils/toast';

interface UseInitialAppLoadingOptions {
  isMapReady: boolean;
  hasInitialCenterCompleted: boolean;
  isAppDataLoading: boolean;
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
  isAppDataLoading,
  timeoutMs = APP_LOADING_TIMEOUT_MS,
  settleMs = DEFAULT_SETTLE_MS,
}: UseInitialAppLoadingOptions): UseInitialAppLoadingResult {
  const { t } = useTranslation();
  const [isInitialLoadingComplete, setIsInitialLoadingComplete] = useState(false);
  const [hasInitialLoadingTimedOut, setHasInitialLoadingTimedOut] = useState(false);

  useEffect(() => {
    if (isInitialLoadingComplete || hasInitialLoadingTimedOut) return;

    const hasFinishedLoading =
      isMapReady &&
      hasInitialCenterCompleted &&
      !isAppDataLoading;
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
    isInitialLoadingComplete,
    isAppDataLoading,
    isMapReady,
    settleMs,
  ]);

  useEffect(() => {
    if (isInitialLoadingComplete || hasInitialLoadingTimedOut) return;

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
  }, [hasInitialLoadingTimedOut, isInitialLoadingComplete, t, timeoutMs]);

  return {
    showInitialLoadingOverlay: !isInitialLoadingComplete && !hasInitialLoadingTimedOut,
  };
}
