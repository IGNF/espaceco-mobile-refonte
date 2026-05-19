import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import type Geometry from 'ol/geom/Geometry';
import type OlMap from 'ol/Map';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { fromLonLat } from 'ol/proj';

import type { Report } from '@ign/mobile-core';

import { findLayerGroupByName } from '@/infra/map/openlayers/layerGroups';
import {
  LAYER_NAME_CROQUIS,
  LAYER_NAME_MES_SIGNALEMENTS,
  SIGNAL_GROUP_NAME,
} from '@/features/map/constants/signalementLayers.constants';
import { parsePointGeometry } from '@/shared/utils/geometry';

export const LOCAL_REPORT_FEATURE_SOURCE = 'local';

/** Creates the local report point feature shown in Mes signalements. */
export function createLocalReportFeature(report: Report): Feature {
  const position = parsePointGeometry(report.geometry)!;
  const feature = new Feature({
    status: report.status,
    reportId: report.id,
    source: LOCAL_REPORT_FEATURE_SOURCE,
  });
  feature.setId(`local-${report.id}`);
  feature.setGeometry(new Point(fromLonLat([position.lon, position.lat])));

  return feature;
}

/** Creates point features for a list of local reports. */
export function createLocalReportFeatures(reports: Report[]): Feature[] {
  return reports.map(createLocalReportFeature);
}

/** Creates cloned sketch features linked to their local report. */
export function createLocalReportSketchFeatures(report: Report): Feature[] {
  return (report.features ?? []).map((reportFeature, index) => {
    const feature = reportFeature.clone();
    feature.set('status', report.status);
    feature.set('reportId', report.id);
    feature.set('source', LOCAL_REPORT_FEATURE_SOURCE);
    feature.setId(`local-${report.id}-sketch-${index}`);

    return feature;
  });
}

/** Creates sketch features for a list of local reports. */
export function createLocalReportsSketchFeatures(reports: Report[]): Feature[] {
  return reports.flatMap(createLocalReportSketchFeatures);
}

function getSignalementVectorLayer(
  map: OlMap,
  layerName: string
): VectorLayer<VectorSource<Feature<Geometry>>> | null {
  const signalementGroup = findLayerGroupByName(map, SIGNAL_GROUP_NAME);
  const layer = signalementGroup
    ?.getLayers()
    .getArray()
    .find((candidateLayer) => candidateLayer.get('name') === layerName);

  return layer
    ? layer as VectorLayer<VectorSource<Feature<Geometry>>>
    : null;
}

/** Finds the Mes signalements layer used to display local report points. */
export function getLocalReportsLayer(map: OlMap): VectorLayer<VectorSource<Feature<Geometry>>> | null {
  return getSignalementVectorLayer(map, LAYER_NAME_MES_SIGNALEMENTS);
}

/** Finds the Croquis layer used to display local report sketches. */
export function getLocalReportSketchesLayer(map: OlMap): VectorLayer<VectorSource<Feature<Geometry>>> | null {
  return getSignalementVectorLayer(map, LAYER_NAME_CROQUIS);
}

function replaceSourceFeatures(
  source: VectorSource<Feature<Geometry>>,
  features: Feature[]
): void {
  for (const feature of features) {
    const featureId = feature.getId();
    const existingFeature = featureId ? source.getFeatureById(featureId) : null;
    if (existingFeature) {
      source.removeFeature(existingFeature);
    }
  }

  source.addFeatures(features);
}

function removeReportFeatures(
  source: VectorSource<Feature<Geometry>>,
  reportId: number
): void {
  const features = source
    .getFeatures()
    .filter((feature) => feature.get('reportId') === reportId);

  for (const feature of features) {
    source.removeFeature(feature);
  }
}

/** Adds or replaces a local report point and sketch features on the map. */
export function addLocalReportToMap(map: OlMap, report: Report): void {
  const reportLayer = getLocalReportsLayer(map);
  const sketchLayer = getLocalReportSketchesLayer(map);
  const reportSource = reportLayer?.getSource();
  const sketchSource = sketchLayer?.getSource();
  const reportFeature = createLocalReportFeature(report);
  const sketchFeatures = createLocalReportSketchFeatures(report);

  if (reportSource) {
    replaceSourceFeatures(reportSource, [reportFeature]);
  }

  if (sketchSource && sketchFeatures.length > 0) {
    replaceSourceFeatures(sketchSource, sketchFeatures);
  }
}

/** Removes a local report point and sketch features from the map. */
export function removeLocalReportFromMap(map: OlMap, reportId: number): void {
  const reportSource = getLocalReportsLayer(map)?.getSource();
  const sketchSource = getLocalReportSketchesLayer(map)?.getSource();

  if (reportSource) {
    removeReportFeatures(reportSource, reportId);
  }

  if (sketchSource) {
    removeReportFeatures(sketchSource, reportId);
  }
}
