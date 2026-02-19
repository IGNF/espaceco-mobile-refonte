import { useEffect } from 'react';
import type { RefObject } from 'react';
import type OlMap from 'ol/Map';
import LayerGroup from 'ol/layer/Group';
import type BaseLayer from 'ol/layer/Base';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Cluster from 'ol/source/Cluster';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { bbox as bboxStrategy } from 'ol/loadingstrategy';
import type Projection from 'ol/proj/Projection';
import { fromLonLat, transformExtent } from 'ol/proj';
import { Style, Stroke } from 'ol/style';
import { ReportSource, type Report } from '@ign/mobile-core';
import { useCommunity } from '@/features/community/hooks/useCommunity';
import type {
  SignalementLayerKey,
  SignalementLayerOpacity,
  SignalementLayerVisibility
} from '@/features/map/types/signalementLayers';
import {
  SIGNAL_LAYER_KEYS,
  normalizeSignalementLayerOrder,
} from '@/features/map/types/signalementLayers';
import { collabApiClient } from '@/infra/api/collabApiClient';
import { cacheStorage } from '@/infra/storage/cacheStorage';
import { ReportStorageAdapter } from '@/infra/storage';
import { parsePointGeometry } from '@/shared/utils/geometry';
import { clampNumber } from '@/shared/utils/number';

const SIGNAL_GROUP_NAME = 'signalementGroup';
const LAYER_NAME_MES_SIGNALEMENTS = 'MesSignalements';
const LAYER_NAME_CROQUIS = 'Croquis';
const LAYER_NAME_SIGNALEMENTS = 'Signalements';
const LAYER_NAME_BY_SIGNALEMENT_KEY: Record<SignalementLayerKey, string> = {
  [SIGNAL_LAYER_KEYS.mesSignalements]: LAYER_NAME_MES_SIGNALEMENTS,
  [SIGNAL_LAYER_KEYS.croquis]: LAYER_NAME_CROQUIS,
  [SIGNAL_LAYER_KEYS.signalements]: LAYER_NAME_SIGNALEMENTS,
};

const CROQUIS_STYLE = new Style({
  stroke: new Stroke({
    color: [0, 153, 255, 1],
    width: 6,
  }),
});

function findLayerGroup(map: OlMap, name: string): LayerGroup | undefined {
  return map
    .getLayers()
    .getArray()
    .find((layer) => layer.get('name') === name) as LayerGroup | undefined;
}

function getOrCreateSignalementGroup(map: OlMap): LayerGroup {
  const existingGroup = findLayerGroup(map, SIGNAL_GROUP_NAME);
  if (existingGroup) {
    return existingGroup;
  }

  const group = new LayerGroup({
    properties: {
      title: 'Signalements',
      name: SIGNAL_GROUP_NAME,
      visible: true,
      displayInLayerSwitcher: false,
      openInLayerSwitcher: true,
    },
    layers: [],
  });

  map.addLayer(group);
  return group;
}

function getLocalReportFeatures(reports: Report[]): Feature[] {
  return reports.flatMap((report) => {
    if (typeof report.geometry !== 'string') {
      return [];
    }

    const position = parsePointGeometry(report.geometry);
    if (!position) {
      return [];
    }

    const feature = new Feature({
      status: report.status,
      reportId: report.id,
      source: 'local',
    });
    feature.setId(`local-${report.id}`);
    feature.setGeometry(new Point(fromLonLat([position.lon, position.lat])));

    return [feature];
  });
}

function copyReportProperties(targetFeature: Feature): Feature {
  const reportFeature = targetFeature.get('report');
  if (!(reportFeature instanceof Feature)) {
    return targetFeature;
  }

  const reportId = Number(reportFeature.get('id'));
  const status = reportFeature.get('status');

  if (Number.isFinite(reportId)) {
    targetFeature.setId(`server-${reportId}`);
  }

  if (typeof status === 'string') {
    targetFeature.set('status', status);
  }

  targetFeature.set('source', 'server');

  return targetFeature;
}

function deduplicateFeatures(features: Feature[]): Feature[] {
  const byId = new Map<string, Feature>();

  for (const feature of features) {
    const featureId = feature.getId();
    const key = featureId === undefined ? `feature-${byId.size}` : String(featureId);
    byId.set(key, feature);
  }

  return Array.from(byId.values());
}

export function useSignalementMapLayers(
  mapRef: RefObject<OlMap | null>,
  signalementLayerVisibility: SignalementLayerVisibility,
  signalementLayerOpacity: SignalementLayerOpacity,
  signalementLayerOrder: SignalementLayerKey[],
  isMapReady: boolean
) {
  const { activeCommunity } = useCommunity();

  useEffect(() => {
    if (!isMapReady) return;

    const map = mapRef.current;
    if (!map) return;

    const signalementGroup = getOrCreateSignalementGroup(map);
    signalementGroup.getLayers().clear();

    const reportSource = new ReportSource({
      client: collabApiClient,
      communityId: activeCommunity?.id,
      loadClosed: false,
      cache: cacheStorage,
    });

    const myReportsSource = new VectorSource();
    const myReportsLayer = new VectorLayer({
      source: myReportsSource,
      style: (feature) => reportSource.getStatusStyle(feature as Feature),
      properties: {
        title: 'Mes signalements',
        name: LAYER_NAME_MES_SIGNALEMENTS,
      },
      zIndex: Infinity,
    });
    myReportsLayer.setVisible(true);

    const croquisSource = new VectorSource();
    const croquisLayer = new VectorLayer({
      source: croquisSource,
      style: CROQUIS_STYLE,
      properties: {
        title: 'Croquis',
        name: LAYER_NAME_CROQUIS,
      },
      zIndex: Infinity,
    });
    croquisLayer.setVisible(true);

    const remoteReportsSource = new VectorSource({
      strategy: bboxStrategy,
      loader: async (extent, _resolution, projection, success, failure) => {
        try {
          const mapProjectionCode = (projection as Projection).getCode();
          const extent4326 = transformExtent(
            extent,
            mapProjectionCode,
            'EPSG:4326'
          );
          const reports = await reportSource.loadReports(extent4326);
          const loadedFeatures = await reportSource.loadFeatures(
            reports,
            projection as Projection
          );
          const normalizedFeatures = deduplicateFeatures(
            loadedFeatures.map(copyReportProperties)
          );
          const knownFeatureIds = new Set(
            remoteReportsSource
              .getFeatures()
              .map((feature) => feature.getId())
              .filter((featureId): featureId is string | number => featureId !== undefined)
              .map((featureId) => String(featureId))
          );

          const featuresToAdd = normalizedFeatures.filter((feature) => {
            const featureId = feature.getId();
            if (featureId === undefined) {
              return true;
            }

            const key = String(featureId);
            if (knownFeatureIds.has(key)) {
              return false;
            }

            knownFeatureIds.add(key);
            return true;
          });

          if (featuresToAdd.length > 0) {
            remoteReportsSource.addFeatures(featuresToAdd);
          }

          if (success) {
            success(featuresToAdd);
          }
        } catch (error) {
          console.error('[Signalements] Failed to load reports layer', error);
          if (failure) {
            failure();
          }
        }
      },
    });

    const clusteredReportsSource = new Cluster({
      source: remoteReportsSource,
      distance: 30,
    });

    const signalementsLayer = new VectorLayer({
      source: clusteredReportsSource,
      style: (feature) => reportSource.getStatusStyle(feature as Feature),
      properties: {
        title: 'Signalements',
        name: LAYER_NAME_SIGNALEMENTS,
      },
      maxResolution: 30,
      zIndex: Infinity,
    });
    signalementsLayer.setVisible(true);

    signalementGroup.getLayers().push(signalementsLayer as BaseLayer);
    signalementGroup.getLayers().push(croquisLayer as BaseLayer);
    signalementGroup.getLayers().push(myReportsLayer as BaseLayer);
    signalementGroup.setVisible(true);

    let cancelled = false;

    const loadLocalReports = async () => {
      try {
        const storage = new ReportStorageAdapter();
        const reports = activeCommunity?.id
          ? await storage.getReportsByCommunity(activeCommunity.id)
          : await storage.listReports();

        if (cancelled) {
          return;
        }

        const localFeatures = getLocalReportFeatures(reports as Report[]);
        myReportsSource.clear(true);
        myReportsSource.addFeatures(localFeatures);
      } catch (error) {
        console.error('[Signalements] Failed to load local reports layer', error);
      }
    };

    loadLocalReports();

    return () => {
      cancelled = true;
    };
  }, [activeCommunity?.id, isMapReady, mapRef]);

  useEffect(() => {
    if (!isMapReady) return;

    const map = mapRef.current;
    if (!map) return;

    const signalementGroup = findLayerGroup(map, SIGNAL_GROUP_NAME);
    if (!signalementGroup) return;

    const visibilityByLayerName = new Map<string, boolean>([
      [
        LAYER_NAME_MES_SIGNALEMENTS,
        signalementLayerVisibility[SIGNAL_LAYER_KEYS.mesSignalements],
      ],
      [LAYER_NAME_CROQUIS, signalementLayerVisibility[SIGNAL_LAYER_KEYS.croquis]],
      [
        LAYER_NAME_SIGNALEMENTS,
        signalementLayerVisibility[SIGNAL_LAYER_KEYS.signalements],
      ],
    ]);
    const opacityByLayerName = new Map<string, number>([
      [
        LAYER_NAME_MES_SIGNALEMENTS,
        signalementLayerOpacity[SIGNAL_LAYER_KEYS.mesSignalements],
      ],
      [LAYER_NAME_CROQUIS, signalementLayerOpacity[SIGNAL_LAYER_KEYS.croquis]],
      [
        LAYER_NAME_SIGNALEMENTS,
        signalementLayerOpacity[SIGNAL_LAYER_KEYS.signalements],
      ],
    ]);
    const normalizedSignalementLayerOrder = normalizeSignalementLayerOrder(
      signalementLayerOrder
    );
    const layersByName = new Map<string, BaseLayer>();

    for (const layer of signalementGroup.getLayers().getArray()) {
      const layerName = layer.get('name');
      if (typeof layerName === 'string') {
        layersByName.set(layerName, layer);
      }
    }

    const orderedLayers: BaseLayer[] = [];

    for (const layerKey of normalizedSignalementLayerOrder) {
      const layerName = LAYER_NAME_BY_SIGNALEMENT_KEY[layerKey];
      const layer = layersByName.get(layerName);

      if (!layer) {
        continue;
      }

      orderedLayers.push(layer);
      layersByName.delete(layerName);
    }

    for (const layer of layersByName.values()) {
      orderedLayers.push(layer);
    }

    signalementGroup.getLayers().clear();
    for (const layer of orderedLayers) {
      signalementGroup.getLayers().push(layer);
    }

    for (const layer of signalementGroup.getLayers().getArray()) {
      const layerName = layer.get('name');
      if (typeof layerName !== 'string') continue;

      const visible = visibilityByLayerName.get(layerName);
      if (typeof visible === 'boolean') {
        layer.setVisible(visible);
      }

      const opacity = opacityByLayerName.get(layerName);
      if (typeof opacity === 'number' && Number.isFinite(opacity)) {
        layer.setOpacity(clampNumber(opacity, 0, 1));
      }
    }

    signalementGroup.setVisible(
      Array.from(visibilityByLayerName.values()).some(Boolean)
    );
  }, [
    isMapReady,
    mapRef,
    signalementLayerOpacity,
    signalementLayerOrder,
    signalementLayerVisibility,
  ]);
}
