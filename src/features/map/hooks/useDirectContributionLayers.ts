import { useCallback, useEffect, useMemo, useState } from 'react';
import type { RefObject } from 'react';
import type Map from 'ol/Map';
import type { CommunityLayer } from '@ign/mobile-core';
import { useTranslation } from 'react-i18next';
import { useCommunity } from '@/features/community/hooks/useCommunity';
import {
  parseDirectContributionConflict,
  type DirectContributionConflict,
  type DirectContributionConflictResolutionSelection,
} from '@/domain/community/directContributionConflicts';
import {
  DirectContributionLayerService,
} from '@/infra/map/directContribution/DirectContributionLayerService';
import { getUserFacingErrorMessage, toAppError } from '@/shared/errors/appError';
import { showToastSafe } from '@/shared/utils/toast';
import { getCommunityLayerKey } from '@/shared/utils/layerKey';

function getConflictResolutionCounts(
  selection: DirectContributionConflictResolutionSelection
): Record<'force' | 'delete' | 'report', number> {
  const counts = {
    force: 0,
    delete: 0,
    report: 0,
  };

  const conflictKeys = Object.keys(selection.resolutionsByConflictKey);

  for (const conflictKey of conflictKeys) {
    const choice = selection.resolutionsByConflictKey[conflictKey];
    if (choice) {
      counts[choice] ++;
    }
  }

  return counts;
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
  confirmConflictResolutions: (
    selection: DirectContributionConflictResolutionSelection
  ) => Promise<boolean>;
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
  const { activeCommunity } = useCommunity();
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
              idName: table.idName ?? 'id',
            }
          : null;
      const conflict = conflictContext
        ? parseDirectContributionConflict(error, conflictContext)
        : null;

      if (conflict) {
        const enrichedConflict = {
          ...conflict,
          conflicts: conflict.conflicts.map((conflictObject) => ({
            ...conflictObject,
            ...layerService.getConflictLocalData(
              layerKey,
              conflict.idName,
              conflictObject.objectId
            ),
          })),
        };

        setActiveConflict(enrichedConflict);
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

  /**
   * Applies the chosen legacy conflict actions on the live collaborative source.
   */
  const confirmConflictResolutions = useCallback(async (
    selection: DirectContributionConflictResolutionSelection
  ): Promise<boolean> => {
    if (!layerService || !activeConflict || !activeCommunity?.id) {
      return false;
    }

    const conflictLayerKey = activeConflict.layerKey;
    // return false is already submitting
    if (submittingByLayerKey[conflictLayerKey] === true) {
      return false;
    }

    setSubmittingByLayerKey((current) => ({
      ...current,
      [conflictLayerKey]: true,
    }));

    try {
      const result = await layerService.applyConflictResolutions(
        activeConflict,
        selection,
        {
          communityId: activeCommunity.id,
        }
      );
      const resolutionCounts = getConflictResolutionCounts(selection);
      const resolutionSummaryParts: string[] = [];

      setActiveConflict(null);

      if (resolutionCounts.force > 0) {
        resolutionSummaryParts.push(
          t('layers.directContribution.conflicts.forceApplied', {
            count: resolutionCounts.force,
          })
        );
      }

      if (resolutionCounts.delete > 0) {
        resolutionSummaryParts.push(
          t('layers.directContribution.conflicts.deleteApplied', {
            count: resolutionCounts.delete,
          })
        );
      }

      if (result.createdReportCount > 0) {
        resolutionSummaryParts.push(
          t('layers.directContribution.conflicts.reportApplied', {
            count: result.createdReportCount,
          })
        );
      }

      await showToastSafe({
        text:
          resolutionSummaryParts.length > 0
            ? resolutionSummaryParts.join(' · ')
            : t('layers.directContribution.conflicts.resolutionSuccess'),
        duration: 'short',
        position: 'top',
      });

      return true;
    } catch (error) {
      const appError = toAppError(error, {
        fallbackKind: 'unknown',
        fallbackTranslationKey: 'layers.directContribution.conflicts.resolutionError',
      });

      console.error('[DirectContribution] Failed to resolve conflicts', appError);
      await showToastSafe({
        text: getUserFacingErrorMessage(
          appError,
          t,
          'layers.directContribution.conflicts.resolutionError'
        ),
        duration: 'short',
        position: 'top',
      });

      return false;
    } finally {
      setSubmittingByLayerKey((current) => {
        const next = { ...current };
        delete next[conflictLayerKey];
        return next;
      });
      refreshPendingChangesCounts();
    }
  }, [
    activeCommunity?.id,
    activeConflict,
    layerService,
    refreshPendingChangesCounts,
    submittingByLayerKey,
    t,
  ]);

  return {
    pendingChangesCountByLayerKey,
    submittingByLayerKey,
    activeConflict,
    clearActiveConflict,
    confirmConflictResolutions,
    sendLayerDirectContributions,
    resetLayerDirectContributions,
  };
}
