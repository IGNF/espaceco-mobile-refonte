import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type OlMap from 'ol/Map';

import type { CommunityLayer } from '@ign/mobile-core';

import { DirectContributionLayerService } from '@/infra/map/directContribution/DirectContributionLayerService';

import type { DirectContributionFeatureCandidate } from '@/features/map/types/directContributionFeatureCandidate';
import { getDirectContributionFeatureCandidatesAtPixel } from '@/features/map/utils/directContributionFeatureCandidates';

import { getCommunityLayerKey } from '@/shared/utils/layerKey';
import { COMMUNITY_FEATURE_CONSULTATION_HIT_TOLERANCE } from '@/shared/constants/map';

export interface UseCommunityFeatureConsultationOptions {
  map: OlMap | null;
  vectorLayers: CommunityLayer[];
  disabled?: boolean;
  onCandidatesAtPixel?: (
    pixel: number[],
    candidates: DirectContributionFeatureCandidate[]
  ) => boolean;
}
export interface UseCommunityFeatureConsultationReturn {
  featureCandidates: DirectContributionFeatureCandidate[];
  selectedFeatureCandidate: DirectContributionFeatureCandidate | null;
  isFeatureChoiceOpen: boolean;
  selectFeatureCandidate: (candidateKey: string) => void;
  closeFeatureChoice: () => void;
  closeFeatureDetails: () => void;
  goBackFromFeatureDetails: () => void;
  getFeatureCandidatesAtPixel: (pixel: number[]) => DirectContributionFeatureCandidate[];
  openFeatureCandidates: (candidates: DirectContributionFeatureCandidate[]) => void;
}

function getConsultationCandidateContextLabel(
  candidate: DirectContributionFeatureCandidate
): string | undefined {
  const layerTitle = candidate.layer.title
  const secondaryLabel = candidate.secondaryLabel

  if (layerTitle && secondaryLabel) {
    return `${layerTitle} · ${secondaryLabel}`
  }

  return layerTitle || secondaryLabel
}

export function useCommunityFeatureConsultation({
  map,
  vectorLayers,
  disabled = false,
  onCandidatesAtPixel,
}: UseCommunityFeatureConsultationOptions): UseCommunityFeatureConsultationReturn {
  const { t } = useTranslation();
  const [featureCandidates, setFeatureCandidates] = useState<
    DirectContributionFeatureCandidate[]
  >([]);
  const [selectedFeatureCandidate, setSelectedFeatureCandidate] = useState<
    DirectContributionFeatureCandidate | null
  >(null);
  const [isFeatureChoiceOpen, setIsFeatureChoiceOpen] = useState(false);

  const layerService = useMemo(() => {
    return map ? new DirectContributionLayerService(map) : null;
  }, [map]);

  const closeFeatureChoice = useCallback(() => {
    setIsFeatureChoiceOpen(false);
  }, []);

  const closeFeatureDetails = useCallback(() => {
    setSelectedFeatureCandidate(null);
    setFeatureCandidates([]);
    setIsFeatureChoiceOpen(false);
  }, []);

  const openFeatureDetails = useCallback(
    (candidate: DirectContributionFeatureCandidate) => {
      setSelectedFeatureCandidate(candidate);
      setIsFeatureChoiceOpen(false);
    },
    []
  );

  const selectFeatureCandidate = useCallback((candidateKey: string) => {
      const candidate = featureCandidates.find(
        (currentCandidate) => currentCandidate.key === candidateKey
      )!;

      openFeatureDetails(candidate);
    },
    [featureCandidates, openFeatureDetails]
  );

  const goBackFromFeatureDetails = useCallback(() => {
    if (featureCandidates.length > 1) {
      setSelectedFeatureCandidate(null);
      setIsFeatureChoiceOpen(true);
      return;
    }

    closeFeatureDetails();
  }, [closeFeatureDetails, featureCandidates.length]);

  const getFeatureCandidatesAtPixel = useCallback((pixel: number[]) => {
    if (!map || !layerService) return [];

    const nextCandidatesByKey = new Map<string, DirectContributionFeatureCandidate>();

    for (const communityLayer of vectorLayers) {
      if (!communityLayer.visible || !communityLayer.table) {
        continue;
      }

      const layerKey = getCommunityLayerKey(communityLayer);
      const collabLayer = layerService.getCollabLayer(layerKey);
      const collabSource = layerService.getCollabSource(layerKey);
      if (!collabLayer || !collabSource) {
        continue;
      }

      const layerCandidates = getDirectContributionFeatureCandidatesAtPixel({
        map,
        pixel,
        layer: collabLayer,
        source: collabSource,
        communityLayer,
        table: communityLayer.table,
        hitTolerance: COMMUNITY_FEATURE_CONSULTATION_HIT_TOLERANCE,
        fallbackLabel: t('layers.directContribution.objectChoice.defaultObjectName'),
      });

      for (const candidate of layerCandidates) {
        nextCandidatesByKey.set(
          candidate.key,
          {
            ...candidate,
            secondaryLabel: getConsultationCandidateContextLabel(candidate),
          }
        );
      }
    }

    return Array.from(nextCandidatesByKey.values());
  }, [layerService, map, t, vectorLayers]);

  const openFeatureCandidates = useCallback((candidates: DirectContributionFeatureCandidate[]) => {
    setFeatureCandidates(candidates);

    if (candidates.length === 1) {
      openFeatureDetails(candidates[0]);
      return;
    }

    setSelectedFeatureCandidate(null);
    setIsFeatureChoiceOpen(true);
  }, [openFeatureDetails]);

  useEffect(() => {
    if (
      !map ||
      !layerService ||
      disabled ||
      isFeatureChoiceOpen ||
      selectedFeatureCandidate
    ) {
      return;
    }

    const handleMapSingleClick = (event: { pixel: number[] }) => {
      const nextCandidates = getFeatureCandidatesAtPixel(event.pixel);
      if (nextCandidates.length === 0) {
        return;
      }

      if (onCandidatesAtPixel?.(event.pixel, nextCandidates)) {
        return;
      }

      openFeatureCandidates(nextCandidates);
    };

    map.on('singleclick', handleMapSingleClick);

    return () => {
      map.un('singleclick', handleMapSingleClick);
    };
  }, [
    disabled,
    getFeatureCandidatesAtPixel,
    isFeatureChoiceOpen,
    layerService,
    map,
    onCandidatesAtPixel,
    openFeatureCandidates,
    selectedFeatureCandidate,
  ]);

  return {
    featureCandidates,
    selectedFeatureCandidate,
    isFeatureChoiceOpen,
    selectFeatureCandidate,
    closeFeatureChoice,
    closeFeatureDetails,
    goBackFromFeatureDetails,
    getFeatureCandidatesAtPixel,
    openFeatureCandidates,
  };
}
