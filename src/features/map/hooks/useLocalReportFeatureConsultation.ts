import { useCallback, useEffect, useState } from 'react';

import Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import type VectorLayer from 'ol/layer/Vector';
import type MapBrowserEvent from 'ol/MapBrowserEvent';
import type OlMap from 'ol/Map';
import type VectorSource from 'ol/source/Vector';

import type { AppReport } from '@/domain/report/models';
import { ReportStorageAdapter } from '@/infra/storage';
import {
  getLocalReportSketchesLayer,
  getLocalReportsLayer,
} from '@/features/map/utils/signalementReportFeatures';
import { COMMUNITY_FEATURE_CONSULTATION_HIT_TOLERANCE } from '@/shared/constants/map';

const reportStorage = new ReportStorageAdapter();

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
    const clickableLayers: VectorLayer<VectorSource<Feature<Geometry>>>[] = [];
    if (localReportsLayer) {
      clickableLayers.push(localReportsLayer);
    }
    if (localReportSketchesLayer) {
      clickableLayers.push(localReportSketchesLayer);
    }

    if (clickableLayers.length === 0) {
      return;
    }

    const handleMapSingleClick = (event: MapBrowserEvent) => {
      let reportId: number | null = null;

      map.forEachFeatureAtPixel(
        event.pixel,
        (featureLike) => {
          if (!(featureLike instanceof Feature)) {
            return undefined;
          }

          reportId = Number(featureLike.get('reportId'));
          return true;
        },
        {
          hitTolerance: COMMUNITY_FEATURE_CONSULTATION_HIT_TOLERANCE,
          layerFilter: (layer) => clickableLayers.some(
            (clickableLayer) => clickableLayer === layer
          ),
        }
      );

      if (reportId === null) {
        return;
      }

      void reportStorage.getReport(reportId).then((report) => {
        if (report) {
          setSelectedReport(report as AppReport);
        }
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
