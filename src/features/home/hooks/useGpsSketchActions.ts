import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import type OlMap from 'ol/Map';
import { toLonLat } from 'ol/proj';

import type { Position } from '@/platform/device/geolocation';
import { emailTextFile } from '@/platform/device/emailExport';
import { getLineStringGeometry } from '@/features/report/utils/traceGeometry';
import { setReportFeatureKind } from '@/features/report/utils/reportObjects';
import { createGpxFilename, createGpxFromFeature } from '@/shared/utils/gpx';
import { createPositionFromLonLat } from '@/shared/utils/position';
import { showToastSafe } from '@/shared/utils/toast';

export interface GpsSketchReportDraft {
  position: Position;
  sketches: Feature<Geometry>[];
}

interface UseGpsSketchActionsOptions {
  map: OlMap | null;
  selectedSketch: Feature<Geometry> | null;
  clearSelection: () => void;
  onCreateReport: (draft: GpsSketchReportDraft) => void;
}

/**
 * Handles actions available after selecting a recorded GPS sketch.
 * The home page keeps the navigation state, while this hook owns the geometry
 * conversion, report draft preparation, GPX generation, and native email export.
 */
export function useGpsSketchActions({
  map,
  selectedSketch,
  clearSelection,
  onCreateReport,
}: UseGpsSketchActionsOptions) {
  const { t } = useTranslation();
  const [isExporting, setIsExporting] = useState(false);

  /**
   * Reuses the selected LineString as a normal report sketch.
   * The first recorded coordinate becomes the report position so the created
   * report opens around the trace instead of around the user's latest location.
   */
  const createReportFromSketch = useCallback(() => {
    if (!selectedSketch || !map) return;

    const line = getLineStringGeometry(selectedSketch)!;
    const [longitude, latitude] = toLonLat(
      line.getFirstCoordinate(),
      map.getView().getProjection()
    );
    const sketchFeature = selectedSketch.clone();
    setReportFeatureKind(sketchFeature, 'sketch');

    clearSelection();
    onCreateReport({
      position: createPositionFromLonLat(longitude, latitude),
      sketches: [sketchFeature],
    });
  }, [clearSelection, map, onCreateReport, selectedSketch]);

  /**
   * Write the GPX to the app cache, then open the native email composer with that file as an attachment.
   */
  const exportSketchAsGpx = useCallback(async () => {
    if (!selectedSketch || !map || isExporting) return;

    setIsExporting(true);
    try {
      const filename = createGpxFilename();
      const gpx = createGpxFromFeature(selectedSketch, map);

      await emailTextFile({
        filename,
        data: gpx,
        subject: t('home.gpsSketch.emailSubject', {
          date: filename.replace(/\.gpx$/i, ''),
        }),
      });

      await showToastSafe({
        text: t('home.gpsSketch.exportSuccess'),
        duration: 'short',
        position: 'top',
      });
    } catch (error) {
      console.error('Failed to export GPS sketch as GPX', error);
      await showToastSafe({
        text: t('home.gpsSketch.exportError'),
        duration: 'short',
        position: 'top',
      });
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, map, selectedSketch, t]);

  return {
    isExporting,
    createReportFromSketch,
    exportSketchAsGpx,
  };
}
