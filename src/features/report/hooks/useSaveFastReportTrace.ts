import { useCallback, useState } from 'react';

import { ReportStatus, type Report } from '@ign/mobile-core';
import type Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import type OlMap from 'ol/Map';
import { toLonLat } from 'ol/proj';

import type { CommunityThemeConfig } from '@/domain/community/models';
import { ReportStorageAdapter } from '@/infra/storage';
import type { TraceTransportMode } from '@/features/report/constants/reportTrace.constants';
import type { FastReportGpsSettings } from '@/features/report/types/fastReportGps';
import { applyFastReportGpsFeatureProperties } from '@/features/report/utils/fastReportGps';
import { buildDefaultReportAttributeValues } from '@/features/report/utils/reportAttributes';
import { setReportFeatureKind } from '@/features/report/utils/reportObjects';
import {
  cleanLineStringCoordinates,
  getLineStringGeometry,
} from '@/features/report/utils/traceGeometry';

const FAST_REPORT_COMMENT = 'Signalement GPS rapide.';
const reportStorage = new ReportStorageAdapter();

interface SaveFastReportTraceOptions {
  map: OlMap;
  theme: CommunityThemeConfig;
  traceFeature: Feature<Geometry>;
  gpsSettings: FastReportGpsSettings;
  transportMode: TraceTransportMode;
}

export function useSaveFastReportTrace() {
  const [isSaving, setIsSaving] = useState(false);

  const saveFastReportTrace = useCallback(async ({
    map,
    theme,
    traceFeature,
    gpsSettings,
    transportMode,
  }: SaveFastReportTraceOptions): Promise<Report> => {
    setIsSaving(true);
    try {
      const feature = traceFeature.clone();
      cleanLineStringCoordinates(getLineStringGeometry(feature)!);
      applyFastReportGpsFeatureProperties(feature, gpsSettings, transportMode);
      setReportFeatureKind(feature, 'sketch');

      const line = getLineStringGeometry(feature)!;
      const [longitude, latitude] = toLonLat(
        line.getFirstCoordinate(),
        map.getView().getProjection()
      );
      const now = new Date();
      const report: Report = {
        id: Date.now(),
        communityId: theme.communityId!,
        themeId: 0,
        geometry: `POINT(${longitude} ${latitude})`,
        comment: FAST_REPORT_COMMENT,
        attributes: {
          ...buildDefaultReportAttributeValues(theme.attributes),
          themeName: theme.theme,
        },
        status: ReportStatus.Draft,
        createdAt: now,
        modifiedAt: now,
        photos: [],
        features: [feature],
      };

      await reportStorage.saveReport(report);
      return report;
    } finally {
      setIsSaving(false);
    }
  }, []);

  return {
    isSaving,
    saveFastReportTrace,
  };
}
