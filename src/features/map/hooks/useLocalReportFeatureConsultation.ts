import { useCallback, useEffect, useState } from 'react';

import Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import type VectorLayer from 'ol/layer/Vector';
import type MapBrowserEvent from 'ol/MapBrowserEvent';
import type OlMap from 'ol/Map';
import type VectorSource from 'ol/source/Vector';

import type { AppReport } from '@/domain/report/models';
import { mapApiReportToAppReport, type ApiReportResponse } from '@/domain/report/mappers';
import { collabApiClient } from '@/infra/api';
import { ReportStorageAdapter } from '@/infra/storage';
import {
  getLocalReportSketchesLayer,
  getLocalReportsLayer,
  getRemoteReportsLayer,
} from '@/features/map/utils/signalementReportFeatures';
import { COMMUNITY_FEATURE_CONSULTATION_HIT_TOLERANCE } from '@/shared/constants/map';

const reportStorage = new ReportStorageAdapter();

type ReportFeatureHit =
  | { source: 'local'; reportId: number }
  | { source: 'remote'; reportId: number };

export interface UseLocalReportFeatureConsultationOptions {
  map: OlMap | null;
  disabled?: boolean;
}

export function useLocalReportFeatureConsultation({
  map,
  disabled = false,
}: UseLocalReportFeatureConsultationOptions) {
  const [selectedReport, setSelectedReport] = useState<AppReport | null>(null);

  const closeReportDetails = useCallback(() => {
    setSelectedReport(null);
  }, []);

  useEffect(() => {
    if (!map || disabled || selectedReport) {
      return;
    }

    const localReportsLayer = getLocalReportsLayer(map);
    const localReportSketchesLayer = getLocalReportSketchesLayer(map);
    const remoteReportsLayer = getRemoteReportsLayer(map);
    const clickableLayers: VectorLayer<VectorSource<Feature<Geometry>>>[] = [];
    if (localReportsLayer) {
      clickableLayers.push(localReportsLayer);
    }
    if (localReportSketchesLayer) {
      clickableLayers.push(localReportSketchesLayer);
    }
    if (remoteReportsLayer) {
      clickableLayers.push(remoteReportsLayer);
    }

    if (clickableLayers.length === 0) {
      return;
    }

    const loadSelectedReport = async (hit: ReportFeatureHit) => {
      if (hit.source === 'local') {
        const report = await reportStorage.getReport(hit.reportId);
        if (report) {
          setSelectedReport(report as AppReport);
        }
        return;
      }

      const response = await collabApiClient.report.get(hit.reportId);
      setSelectedReport(mapApiReportToAppReport(response.data as ApiReportResponse));
    };

    const getRemoteReportId = (feature: Feature): number | null => {
      const clusteredFeatures = feature.get('features') as Feature[] | undefined;
      if (!clusteredFeatures || clusteredFeatures.length !== 1) {
        return null;
      }

      const reportFeature = clusteredFeatures[0].get('report');
      if (!(reportFeature instanceof Feature)) {
        return null;
      }

      const reportId = Number(reportFeature.get('id'));
      return Number.isFinite(reportId) ? reportId : null;
    };

    const handleMapSingleClick = (event: MapBrowserEvent) => {
      let reportHit: ReportFeatureHit | null = null;

      map.forEachFeatureAtPixel(
        event.pixel,
        (featureLike, layerLike) => {
          if (!(featureLike instanceof Feature)) {
            return undefined;
          }

          if (remoteReportsLayer && layerLike === remoteReportsLayer) {
            const reportId = getRemoteReportId(featureLike);
            if (reportId === null) {
              return undefined;
            }

            reportHit = { source: 'remote', reportId };
            return true;
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
          layerFilter: (layer) => clickableLayers.some(
            (clickableLayer) => clickableLayer === layer
          ),
        }
      );

      if (reportHit === null) {
        return;
      }

      void loadSelectedReport(reportHit).catch((error) => {
        console.error('[Signalements] Failed to open report details from map', error);
      });
    };

    map.on('singleclick', handleMapSingleClick);

    return () => {
      map.un('singleclick', handleMapSingleClick);
    };
  }, [disabled, map, selectedReport]);

  return {
    selectedReport,
    closeReportDetails,
  };
}
