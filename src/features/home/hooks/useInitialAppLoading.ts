import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Toast } from '@capacitor/toast';
import { APP_LOADING_TIMEOUT_MS } from '@/shared/constants/map';

interface UseInitialAppLoadingOptions {
  isMapReady: boolean;
  isMapLoading: boolean;
  isLayersLoading: boolean;
  timeoutMs?: number;
  settleMs?: number;
}

interface UseInitialAppLoadingResult {
  showInitialLoadingOverlay: boolean;
}

const DEFAULT_SETTLE_MS = 400;

export function useInitialAppLoading({
  isMapReady,
  isMapLoading,
  isLayersLoading,
  timeoutMs = APP_LOADING_TIMEOUT_MS,
  settleMs = DEFAULT_SETTLE_MS,
}: UseInitialAppLoadingOptions): UseInitialAppLoadingResult {
  const { t } = useTranslation();
  const [isInitialLoadingComplete, setIsInitialLoadingComplete] = useState(false);
  const [hasInitialLoadingTimedOut, setHasInitialLoadingTimedOut] = useState(false);

  useEffect(() => {
    if (isInitialLoadingComplete || hasInitialLoadingTimedOut) return;

    const hasFinishedLoading = isMapReady && !isLayersLoading && !isMapLoading;
    if (!hasFinishedLoading) return;

    const settleTimeoutId = window.setTimeout(() => {
      setIsInitialLoadingComplete(true);
    }, settleMs);

    return () => {
      window.clearTimeout(settleTimeoutId);
    };
  }, [
    hasInitialLoadingTimedOut,
    isInitialLoadingComplete,
    isLayersLoading,
    isMapLoading,
    isMapReady,
    settleMs,
  ]);

  useEffect(() => {
    if (isInitialLoadingComplete || hasInitialLoadingTimedOut) return;

    const timeoutId = window.setTimeout(() => {
      setHasInitialLoadingTimedOut(true);
      void Toast.show({
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
