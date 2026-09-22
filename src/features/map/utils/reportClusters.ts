import Feature from 'ol/Feature';
import type { Coordinate } from 'ol/coordinate';
import { boundingExtent } from 'ol/extent';
import type Point from 'ol/geom/Point';
import type OlMap from 'ol/Map';

import { LAYER_NAME_SIGNALEMENTS } from '@/features/map/constants/signalementLayers.constants';
import {
  COMMUNITY_FEATURE_CONSULTATION_HIT_TOLERANCE,
  REPORT_CLUSTER_DISTANCE,
  REPORT_CLUSTER_FIT_DURATION_MS,
  REPORT_CLUSTER_FIT_PADDING,
  REPORT_CLUSTER_ZOOM_STEP,
} from '@/shared/constants/map';

export interface RemoteReportChoiceInfo {
  reportId: number;
  status?: string;
  themeName?: string;
}

function getClusterMembers(feature: Feature): Feature[] {
  const clusteredFeatures = feature.get('features');
  return Array.isArray(clusteredFeatures) ? clusteredFeatures : [];
}

// Report geometries come from @ign/mobile-core's WKT reader, whose `ol` copy is
// not always the same class as this app's Point — `instanceof Point` misses them.
function getFeatureCoordinate(feature: Feature): Coordinate | null {
  const geometry = feature.getGeometry();
  if (!geometry || geometry.getType() !== 'Point') {
    return null;
  }

  return (geometry as Point).getCoordinates();
}

// False for coincident points: they stay clustered at every zoom, so a chooser is needed.
export function canZoomToSeparateCluster(map: OlMap, features: Feature[]): boolean {
  const coordinates = features
    .map(getFeatureCoordinate)
    .filter((coordinate): coordinate is Coordinate => coordinate !== null);

  if (coordinates.length < 2) {
    return false;
  }

  const view = map.getView();
  const currentZoom = view.getZoom();
  const maxZoom = view.getMaxZoom();
  if (currentZoom == null || currentZoom >= maxZoom) {
    return false;
  }

  const maxResolution = view.getResolutionForZoom(maxZoom);
  if (!maxResolution) {
    return false;
  }

  let maxPixelDistance = 0;
  for (let i = 0; i < coordinates.length; i += 1) {
    for (let j = i + 1; j < coordinates.length; j += 1) {
      const deltaX = (coordinates[i][0] - coordinates[j][0]) / maxResolution;
      const deltaY = (coordinates[i][1] - coordinates[j][1]) / maxResolution;
      maxPixelDistance = Math.max(maxPixelDistance, Math.hypot(deltaX, deltaY));
    }
  }

  return maxPixelDistance > REPORT_CLUSTER_DISTANCE;
}

export function zoomToClusterFeatures(map: OlMap, features: Feature[]): void {
  const coordinates = features
    .map(getFeatureCoordinate)
    .filter((coordinate): coordinate is Coordinate => coordinate !== null);

  if (coordinates.length === 0) {
    return;
  }

  const view = map.getView();
  const currentZoom = view.getZoom();
  if (currentZoom == null) {
    return;
  }

  view.fit(boundingExtent(coordinates), {
    padding: [...REPORT_CLUSTER_FIT_PADDING],
    duration: REPORT_CLUSTER_FIT_DURATION_MS,
    // Tight clusters would otherwise jump all the way to max zoom.
    maxZoom: Math.min(currentZoom + REPORT_CLUSTER_ZOOM_STEP, view.getMaxZoom()),
  });
}

export function getRemoteReportChoiceInfo(feature: Feature): RemoteReportChoiceInfo | null {
  const reportFeature = feature.get('report');
  if (!(reportFeature instanceof Feature)) {
    return null;
  }

  const reportId = Number(reportFeature.get('id'));
  if (!Number.isFinite(reportId)) {
    return null;
  }

  const status = reportFeature.get('status');
  const attributes = reportFeature.get('attributes');
  const themeName = Array.isArray(attributes) ? attributes[0]?.theme : undefined;

  return {
    reportId,
    status: typeof status === 'string' ? status : undefined,
    themeName: typeof themeName === 'string' ? themeName : undefined,
  };
}

export function getRemoteReportMembersAtPixel(map: OlMap, pixel: number[]): Feature[] {
  let members: Feature[] = [];

  map.forEachFeatureAtPixel(
    pixel,
    (featureLike, layerLike) => {
      // Match by name: the signalement layers are recreated, so object identity goes stale.
      if (!(featureLike instanceof Feature) || layerLike?.get('name') !== LAYER_NAME_SIGNALEMENTS) {
        return undefined;
      }

      const clusteredFeatures = getClusterMembers(featureLike);
      if (clusteredFeatures.length === 0) {
        return undefined;
      }

      members = clusteredFeatures;
      return true;
    },
    {
      hitTolerance: COMMUNITY_FEATURE_CONSULTATION_HIT_TOLERANCE,
      layerFilter: (layer) => layer.get('name') === LAYER_NAME_SIGNALEMENTS,
    }
  );

  return members;
}
