import Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import type BaseLayer from 'ol/layer/Base';
import LayerGroup from 'ol/layer/Group';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import type OlMap from 'ol/Map';
import WKT from 'ol/format/WKT';

import type { AppReport } from '@/domain/report/models';

import {
  REPORT_DETAILS_ATTACHMENT_HIGHLIGHT_LAYER_NAME,
  REPORT_DETAILS_ATTACHMENT_HIGHLIGHT_LAYER_TITLE,
  REPORT_DETAILS_ATTACHMENT_HIGHLIGHT_STYLE,
  REPORT_DETAILS_MAP_DIMMED_OPACITY_FACTOR,
} from '@/features/report/constants/reportDetailsMap.constants';
import { LAYER_NAME_SIGNALEMENTS } from '@/features/map/constants/signalementLayers.constants';
import { WGS84_PROJECTION } from '@/shared/constants/projections';

const sketchGeometryFormat = new WKT();

interface ReportSketch {
  objects: ReportSketchObject[];
}

interface ReportSketchObject {
  attributes?: Record<string, unknown>;
  geometry: string;
}

function getLeafLayers(layer: BaseLayer): BaseLayer[] {
  if (layer instanceof LayerGroup) {
    return layer.getLayers().getArray().flatMap(getLeafLayers);
  }

  return [layer];
}

function getMapLeafLayers(map: OlMap): BaseLayer[] {
  return map.getLayers().getArray().flatMap(getLeafLayers);
}

function getSketchFeatures(map: OlMap, sketch: string): Feature<Geometry>[] {
  const sketchData = JSON.parse(sketch) as ReportSketch;
  const mapProjection = map.getView().getProjection();

  return sketchData.objects.map((sketchObject) => {
    const geometry = sketchGeometryFormat.readGeometry(sketchObject.geometry);
    geometry.transform(WGS84_PROJECTION, mapProjection);

    return new Feature<Geometry>({
      ...(sketchObject.attributes ?? {}),
      geometry,
    });
  });
}

function getReportAttachmentFeatures(map: OlMap, report: AppReport): Feature<Geometry>[] {
  if (report.features?.length) {
    return report.features.map((feature) => feature.clone() as Feature<Geometry>);
  }

  if (report.sketch) {
    return getSketchFeatures(map, report.sketch);
  }

  return [];
}

function createAttachmentHighlightLayer(
  map: OlMap,
  report: AppReport
): VectorLayer<VectorSource<Feature<Geometry>>> | null {
  const attachmentFeatures = getReportAttachmentFeatures(map, report);

  if (attachmentFeatures.length === 0) {
    return null;
  }

  return new VectorLayer({
    source: new VectorSource<Feature<Geometry>>({
      features: attachmentFeatures,
    }),
    style: REPORT_DETAILS_ATTACHMENT_HIGHLIGHT_STYLE,
    properties: {
      title: REPORT_DETAILS_ATTACHMENT_HIGHLIGHT_LAYER_TITLE,
      name: REPORT_DETAILS_ATTACHMENT_HIGHLIGHT_LAYER_NAME,
      displayInLayerSwitcher: false,
    },
    zIndex: Infinity,
  });
}

/** Highlights the selected report attachments, dims the rest of the map, and returns the cleanup. */
export function applyReportDetailsMapFocus(map: OlMap, report: AppReport): () => void {
  const previousLayerOpacities = new Map<BaseLayer, number>();
  const attachmentHighlightLayer = createAttachmentHighlightLayer(map, report);

  if (attachmentHighlightLayer) {
    map.addLayer(attachmentHighlightLayer);
  }

  for (const layer of getMapLeafLayers(map)) {
    if (layer === attachmentHighlightLayer) continue;

    const previousOpacity = layer.getOpacity();
    previousLayerOpacities.set(layer, previousOpacity);
    layer.setOpacity(previousOpacity * REPORT_DETAILS_MAP_DIMMED_OPACITY_FACTOR);
  }

  return () => {
    if (attachmentHighlightLayer) {
      map.removeLayer(attachmentHighlightLayer);
    }

    for (const [layer, opacity] of previousLayerOpacities) {
      layer.setOpacity(opacity);
    }
  };
}

export function suspendReportDetailsMapReportLoading(map: OlMap): () => void {
  const previousLayerVisibilities = new Map<BaseLayer, boolean>();

  for (const layer of getMapLeafLayers(map)) {
    if (layer.get('name') !== LAYER_NAME_SIGNALEMENTS) continue;

    previousLayerVisibilities.set(layer, layer.getVisible());
    layer.setVisible(false);
  }

  return () => {
    for (const [layer, visible] of previousLayerVisibilities) {
      layer.setVisible(visible);
    }
  };
}
