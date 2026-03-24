import { useCallback, useEffect, useMemo, useState } from 'react';
import type { RefObject } from 'react';
import type Feature from 'ol/Feature';
import type Map from 'ol/Map';
import type { CollabVectorSource, CommunityLayer } from '@ign/mobile-core';
import { useTranslation } from 'react-i18next';
import { parseDirectContributionConflict, type DirectContributionConflict } from '@/domain/community/directContributionConflicts';
import {
  DirectContributionLayerService,
} from '@/infra/map/directContribution/DirectContributionLayerService';
import { getAppErrorTranslationKey, type AppError, toAppError } from '@/shared/errors/appError';
import { showToastSafe } from '@/shared/utils/toast';
import { getCommunityLayerKey } from '@/shared/utils/layerKey';

type DirectContributionPendingFeature = Feature & {
  updates?: Record<string, boolean>;
};

function findPendingFeatureByObjectId(
  source: CollabVectorSource,
  idName: string,
  objectId: string | number
): DirectContributionPendingFeature | null {
  const pendingFeatures = [
    ...source.updatedFeatures.getArray(),
    ...source.deletedFeatures.getArray(),
    ...source.insertedFeatures.getArray(),
  ] as DirectContributionPendingFeature[];

  return pendingFeatures.find((feature) => {
    return feature.get(idName) === objectId || feature.getId() === objectId;
  }) ?? null;
}

function getConflictLocalData(
  source: CollabVectorSource,
  idName: string,
  objectId: string | number
): {
  localObject?: Record<string, unknown>;
  locallyUpdatedFieldNames?: string[];
} {
  const pendingFeature = findPendingFeatureByObjectId(source, idName, objectId);
  if (!pendingFeature) {
    return {};
  }

  return {
    localObject: pendingFeature.getProperties(),
    locallyUpdatedFieldNames: Object.keys(pendingFeature.updates ?? {}),
  };
}

function getUserFacingErrorMessage(
  error: AppError,
  t: (key: string) => string,
  fallbackKey: string
): string {
  return error.message && error.message !== error.translationKey
    ? error.message
    : t(getAppErrorTranslationKey(error, fallbackKey));
}

interface UseDirectContributionLayersParams {
  mapRef: RefObject<Map | null>;
  isMapReady: boolean;
  vectorLayers: CommunityLayer[];
}

interface UseDirectContributionLayersResult {
  pendingChangesCountByLayerKey: Record<string, number>;
  submittingByLayerKey: Record<string, boolean>;
  activeConflict: DirectContributionConflict | null;
  clearActiveConflict: () => void;
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
  const [submittingByLayerKey, setSubmittingByLayerKey] =
    useState<Record<string, boolean>>({});
  const [activeConflict, setActiveConflict] =
    useState<DirectContributionConflict | null>(null);

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

  /**
   * Clears the currently displayed conflict once the dedicated UI has been closed or fully processed.
   */
  const clearActiveConflict = useCallback(() => {
    setActiveConflict(null);
  }, []);

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
    if (!layerService || submittingByLayerKey[layerKey] === true) {
      return;
    }

    setActiveConflict(null);
    setSubmittingByLayerKey((current) => ({
      ...current,
      [layerKey]: true,
    }));

    try {
      await layerService.submitLayerChanges(layerKey);
      await showToastSafe({
        text: t('layers.directContribution.submitSuccess'),
        duration: 'short',
        position: 'top',
      });
    } catch (error) {
      const layer = vectorLayers.find(
        (candidateLayer) => getCommunityLayerKey(candidateLayer) === layerKey
      );
      const table = layer?.table;
      const conflictContext =
        layer && table && typeof table === 'object'
          ? {
              layerKey,
              layerTitle: layer.title,
              idName: typeof table.idName === 'string' ? table.idName : 'id',
            }
          : null;
      const conflict = conflictContext
        ? parseDirectContributionConflict(error, conflictContext)
        : null;

      if (conflict) {
        const source = layerService.getCollabSource(layerKey);
        const nextConflict = source
          ? {
              ...conflict,
              conflicts: conflict.conflicts.map((conflictObject) => ({
                ...conflictObject,
                ...getConflictLocalData(source, conflict.idName, conflictObject.objectId),
              })),
            }
          : conflict;

        setActiveConflict(nextConflict);
        return;
      }

      const appError = toAppError(error, {
        fallbackKind: 'unknown',
        fallbackTranslationKey: 'layers.directContribution.submitError',
      });

      console.error('[DirectContribution] Failed to submit changes', appError);
      await showToastSafe({
        text: getUserFacingErrorMessage(
          appError,
          t,
          'layers.directContribution.submitError'
        ),
        duration: 'short',
        position: 'top',
      });
    } finally {
      setSubmittingByLayerKey((current) => {
        const next = { ...current };
        delete next[layerKey];
        return next;
      });
      refreshPendingChangesCounts();
    }
  }, [
    layerService,
    refreshPendingChangesCounts,
    submittingByLayerKey,
    vectorLayers,
    t,
  ]);

  /**
   * Discards the current layer draft from the collaborative source
   */
  const resetLayerDirectContributions = useCallback(async (layerKey: string) => {
    if (!layerService || submittingByLayerKey[layerKey] === true) {
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
      const appError = toAppError(error, {
        fallbackKind: 'unknown',
        fallbackTranslationKey: 'layers.directContribution.resetError',
      });

      console.error('[DirectContribution] Failed to reset changes', appError);
      await showToastSafe({
        text: getUserFacingErrorMessage(
          appError,
          t,
          'layers.directContribution.resetError'
        ),
        duration: 'short',
        position: 'top',
      });
    } finally {
      refreshPendingChangesCounts();
    }
  }, [layerService, refreshPendingChangesCounts, submittingByLayerKey, t]);

  return {
    pendingChangesCountByLayerKey,
    submittingByLayerKey,
    activeConflict,
    clearActiveConflict,
    sendLayerDirectContributions,
    resetLayerDirectContributions,
  };
}
