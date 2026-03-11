import { useCallback, useEffect, useMemo, useState } from 'react';
import type { RefObject } from 'react';
import type Map from 'ol/Map';
import type { CommunityLayer } from '@ign/mobile-core';
import { useTranslation } from 'react-i18next';
import {
  DirectContributionLayerService,
} from '@/infra/map/directContribution/DirectContributionLayerService';
import { showToastSafe } from '@/shared/utils/toast';
import { getCommunityLayerKey } from '@/shared/utils/layerKey';

interface UseDirectContributionLayersParams {
  mapRef: RefObject<Map | null>;
  isMapReady: boolean;
  vectorLayers: CommunityLayer[];
}

interface UseDirectContributionLayersResult {
  pendingChangesCountByLayerKey: Record<string, number>;
  sendLayerDirectContributions: (layerKey: string) => Promise<void>;
  resetLayerDirectContributions: (layerKey: string) => Promise<void>;
}

/**
 * Keeps badge counts/actions synchronized with the collaborative layers currently mounted on the OpenLayers map.
 */
export function useDirectContributionLayers({
  mapRef,
  isMapReady,
  vectorLayers,
}: UseDirectContributionLayersParams): UseDirectContributionLayersResult {
  const { t } = useTranslation();
  const [pendingChangesCountByLayerKey, setPendingChangesCountByLayerKey] =
    useState<Record<string, number>>({});

  const vectorLayerKeys = useMemo(
    () => vectorLayers.map((layer) => getCommunityLayerKey(layer)),
    [vectorLayers]
  );
  const hasVectorLayers = vectorLayerKeys.length > 0;

  const layerService = useMemo(() => {
    const map = mapRef.current;
    if (!isMapReady || !map) {
      return null;
    }

    return new DirectContributionLayerService(map);
  }, [isMapReady, mapRef]);

  /**
   * Recomputes pending edits for every collaborative layer displayed in the layers panel.
   */
  const refreshPendingChangesCounts = useCallback(() => {
    if (!layerService || !hasVectorLayers) {
      setPendingChangesCountByLayerKey({});
      return;
    }

    setPendingChangesCountByLayerKey(
      layerService.getPendingChangesCountByLayerKeys(vectorLayerKeys)
    );
  }, [hasVectorLayers, layerService, vectorLayerKeys]);

  useEffect(() => {
    refreshPendingChangesCounts();

    if (!layerService || !hasVectorLayers) {
      return;
    }

    // Keep layer badges in sync with the collaborative source lifecycle.
    const stopObserving = layerService.observeLayers(refreshPendingChangesCounts);

    return () => {
      stopObserving();
    };
  }, [
    hasVectorLayers,
    layerService,
    refreshPendingChangesCounts,
  ]);

  /**
   * Sends the current layer draft to the collaborative backend, then refreshes the local badge state
   */
  const sendLayerDirectContributions = useCallback(async (layerKey: string) => {
    if (!layerService) {
      return;
    }

    try {
      await layerService.submitLayerChanges(layerKey);
      await showToastSafe({
        text: t('layers.directContribution.submitSuccess'),
        duration: 'short',
        position: 'top',
      });
    } catch (error) {
      console.error('[DirectContribution] Failed to submit changes', error);
      await showToastSafe({
        text: t('layers.directContribution.submitError'),
        duration: 'short',
        position: 'top',
      });
    } finally {
      refreshPendingChangesCounts();
    }
  }, [layerService, refreshPendingChangesCounts, t]);

  /**
   * Discards the current layer draft from the collaborative source
   */
  const resetLayerDirectContributions = useCallback(async (layerKey: string) => {
    if (!layerService) {
      return;
    }

    try {
      layerService.resetLayerChanges(layerKey);
      await showToastSafe({
        text: t('layers.directContribution.resetSuccess'),
        duration: 'short',
        position: 'top',
      });
    } catch (error) {
      console.error('[DirectContribution] Failed to reset changes', error);
      await showToastSafe({
        text: t('layers.directContribution.resetError'),
        duration: 'short',
        position: 'top',
      });
    } finally {
      refreshPendingChangesCounts();
    }
  }, [layerService, refreshPendingChangesCounts, t]);

  return {
    pendingChangesCountByLayerKey,
    sendLayerDirectContributions,
    resetLayerDirectContributions,
  };
}
