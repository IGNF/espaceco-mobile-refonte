import type Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';

import type { FastReportGpsSettings, FastReportOffsetSetting } from '@/features/report/types/fastReportGps';
import type { TraceTransportMode } from '@/features/report/constants/reportTrace.constants';
import { getLineStringGeometry } from '@/features/report/utils/traceGeometry';

function applyOffsetProperty(
  feature: Feature<Geometry>,
  propertyName: string,
  offset: FastReportOffsetSetting
) {
  if (offset.enabled) {
    feature.set(propertyName, offset.value);
  }
}

export function applyFastReportGpsFeatureProperties(
  feature: Feature<Geometry>,
  settings: FastReportGpsSettings,
  transportMode: TraceTransportMode
) {
  const offsetSettings = settings.offsetByMode[transportMode];

  applyOffsetProperty(feature, 'deportXY', offsetSettings.planimetric);
  applyOffsetProperty(feature, 'deportZ', offsetSettings.altimetric);

  const line = getLineStringGeometry(feature);
  const coordinates = line?.getCoordinates(); // format: [x, y, altitude, timestamp, geoidal]
  if (coordinates?.[0]?.[4] !== undefined) { // if [4] is not undefined, it means there is NMEA data
    feature.set('nmea', coordinates.map((coordinate) => [coordinate[3], coordinate[4]]));
  }
}
