import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Feature from 'ol/Feature';
import type MapBrowserEvent from 'ol/MapBrowserEvent';
import type OlMap from 'ol/Map';

import type { AppReport } from '@/domain/report/models';
import { mapApiReportToAppReport, type ApiReportResponse } from '@/domain/report/mappers';
import { collabApiClient } from '@/infra/api';
import { ReportStorageAdapter } from '@/infra/storage';
import {
  LAYER_NAME_CROQUIS,
  LAYER_NAME_MES_SIGNALEMENTS,
} from '@/features/map/constants/signalementLayers.constants';
import {
  canZoomToSeparateCluster,
  getRemoteReportChoiceInfo,
  getRemoteReportMembersAtPixel,
  zoomToClusterFeatures,
} from '@/features/map/utils/reportClusters';
import { COMMUNITY_FEATURE_CONSULTATION_HIT_TOLERANCE } from '@/shared/constants/map';

const reportStorage = new ReportStorageAdapter();

type ReportFeatureHit =
  | { source: 'local'; reportId: number }
  | { source: 'remote'; reportId: number };

export interface ReportMapChoiceCandidate {
  key: string;
  label: string;
  secondaryLabel?: string;
  source: ReportFeatureHit['source'];
  reportId: number;
}

export interface UseLocalReportFeatureConsultationOptions {
  map: OlMap | null;
  disabled?: boolean;
}

function isLocalReportLayer(layer: { get: (key: string) => unknown } | null | undefined): boolean {
  const layerName = layer?.get('name');
  return layerName === LAYER_NAME_MES_SIGNALEMENTS || layerName === LAYER_NAME_CROQUIS;
}

export function useLocalReportFeatureConsultation({
  map,
  disabled = false,
}: UseLocalReportFeatureConsultationOptions) {
  const { t } = useTranslation();
  const [selectedReport, setSelectedReport] = useState<AppReport | null>(null);
  const [reportCandidates, setReportCandidates] = useState<ReportMapChoiceCandidate[]>([]);
  const [isReportChoiceOpen, setIsReportChoiceOpen] = useState(false);

  const closeReportDetails = useCallback(() => {
    setSelectedReport(null);
    setReportCandidates([]);
    setIsReportChoiceOpen(false);
  }, []);

  const closeReportChoice = useCallback(() => {
    setIsReportChoiceOpen(false);
  }, []);

  const goBackFromReportDetails = useCallback(() => {
    if (reportCandidates.length > 1) {
      setSelectedReport(null);
      setIsReportChoiceOpen(true);
      return;
    }

    closeReportDetails();
  }, [closeReportDetails, reportCandidates.length]);

  const loadSelectedReport = useCallback(async (hit: ReportFeatureHit) => {
    if (hit.source === 'local') {
      const report = await reportStorage.getReport(hit.reportId);
      if (report) {
        setSelectedReport(report as AppReport);
      }
      return;
    }

    const response = await collabApiClient.report.get(hit.reportId);
    setSelectedReport(mapApiReportToAppReport(response.data as ApiReportResponse));
  }, []);

  const openReportDetails = useCallback((hit: ReportFeatureHit) => {
    setIsReportChoiceOpen(false);
    void loadSelectedReport(hit).catch((error) => {
      console.error('[Signalements] Failed to open report details from map', error);
    });
  }, [loadSelectedReport]);

  const selectReportCandidate = useCallback((candidateKey: string) => {
    const candidate = reportCandidates.find(
      (currentCandidate) => currentCandidate.key === candidateKey
    );
    if (!candidate) {
      return;
    }

    openReportDetails({
      source: candidate.source,
      reportId: candidate.reportId,
    });
  }, [openReportDetails, reportCandidates]);

  useEffect(() => {
    if (!map || disabled || selectedReport || isReportChoiceOpen) {
      return;
    }

    const buildRemoteReportCandidates = (members: Feature[]): ReportMapChoiceCandidate[] => {
      const candidates: ReportMapChoiceCandidate[] = [];

      for (const member of members) {
        const reportInfo = getRemoteReportChoiceInfo(member);
        if (!reportInfo) {
          continue;
        }

        const statusLabel = reportInfo.status
          ? t(`reports.status.${reportInfo.status}`, reportInfo.status)
          : undefined;
        const secondaryLabel = [reportInfo.themeName, statusLabel]
          .filter((label): label is string => Boolean(label))
          .join(' · ');

        candidates.push({
          key: `remote-${reportInfo.reportId}`,
          label: `${t('reports.groupReports.reportNumber')}${reportInfo.reportId}`,
          secondaryLabel: secondaryLabel || undefined,
          source: 'remote',
          reportId: reportInfo.reportId,
        });
      }

      return candidates;
    };

    const handleMapSingleClick = (event: MapBrowserEvent) => {
      const remoteMembers = getRemoteReportMembersAtPixel(map, event.pixel);
      // Nearby points: zoom in a step. Coincident points, or already at max zoom: open a chooser.
      if (remoteMembers.length > 1 && canZoomToSeparateCluster(map, remoteMembers)) {
        zoomToClusterFeatures(map, remoteMembers);
        return;
      }

      if (remoteMembers.length > 0) {
        const candidates = buildRemoteReportCandidates(remoteMembers);
        if (candidates.length === 1) {
          setReportCandidates([]);
          openReportDetails(candidates[0]);
          return;
        }

        if (candidates.length > 1) {
          setReportCandidates(candidates);
          setIsReportChoiceOpen(true);
        }

        return;
      }

      let reportHit: ReportFeatureHit | null = null;

      map.forEachFeatureAtPixel(
        event.pixel,
        (featureLike, layerLike) => {
          if (!(featureLike instanceof Feature) || !isLocalReportLayer(layerLike)) {
            return undefined;
          }

          const reportId = Number(featureLike.get('reportId'));
          if (!Number.isFinite(reportId)) {
            return undefined;
          }

          reportHit = { source: 'local', reportId };
          return true;
        },
        {
          hitTolerance: COMMUNITY_FEATURE_CONSULTATION_HIT_TOLERANCE,
          layerFilter: (layer) => isLocalReportLayer(layer),
        }
      );

      if (reportHit === null) {
        return;
      }

      setReportCandidates([]);
      openReportDetails(reportHit);
    };

    map.on('singleclick', handleMapSingleClick);

    return () => {
      map.un('singleclick', handleMapSingleClick);
    };
  }, [disabled, isReportChoiceOpen, map, openReportDetails, selectedReport, t]);

  return {
    selectedReport,
    reportCandidates,
    isReportChoiceOpen,
    selectReportCandidate,
    closeReportChoice,
    closeReportDetails,
    goBackFromReportDetails,
  };
}
