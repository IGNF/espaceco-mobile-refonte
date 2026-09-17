import { useEffect } from 'react';
import type { RefObject } from 'react';

import type OlMap from 'ol/Map';
import LayerGroup from 'ol/layer/Group';
import type BaseLayer from 'ol/layer/Base';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Cluster from 'ol/source/Cluster';
import Feature from 'ol/Feature';
import type { Extent } from 'ol/extent';
import { bbox as bboxStrategy } from 'ol/loadingstrategy';
import type Projection from 'ol/proj/Projection';
import { transformExtent } from 'ol/proj';
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from 'ol/style';

import { ReportSource, type Report } from '@ign/mobile-core';

import { useCommunity } from '@/features/community/hooks/useCommunity';
import type {
  SignalementLayerState
} from '@/features/map/constants/signalementLayers.constants';
import { SIGNAL_LAYER_KEYS, normalizeSignalementLayerOrder } from '@/features/map/constants/signalementLayers.constants';

import type { OfflineMode } from '@/domain/offline/models';

import { collabApiClient } from '@/infra/api/collabApiClient';
import { findLayerGroupByName } from '@/infra/map/openlayers/layerGroups';
import { cacheStorage } from '@/infra/storage/cacheStorage';
import { ReportStorageAdapter } from '@/infra/storage';

import { clampNumber } from '@/shared/utils/number';
import { WGS84_PROJECTION } from '@/shared/constants/projections';
import { SIGNAL_GROUP_NAME, LAYER_NAME_MES_SIGNALEMENTS, LAYER_NAME_CROQUIS, LAYER_NAME_SIGNALEMENTS, LAYER_NAME_BY_SIGNALEMENT_KEY } from '@/features/map/constants/signalementLayers.constants';
import {
  createLocalReportFeatures,
  createLocalReportsSketchFeatures,
} from '@/features/map/utils/signalementReportFeatures';
import { REPORT_CLUSTER_RADIUS } from '@/shared/constants/map';

const CROQUIS_STYLE = new Style({
  stroke: new Stroke({
    color: [0, 153, 255, 1],
    width: 6,
  }),
});

function createReportsClusterStyle(featuresCount: number): Style {
  return new Style({
    image: new CircleStyle({
      radius: REPORT_CLUSTER_RADIUS,
      fill: new Fill({
        color: getComputedStyle(document.documentElement)
          .getPropertyValue('--color-primary')
          .trim(),
      }),
      stroke: new Stroke({
        color: '#ffffff',
        width: 3,
      }),
    }),
    text: new Text({
      text: String(featuresCount),
      fill: new Fill({
        color: '#ffffff',
      }),
      font: '700 14px system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    }),
  });
}

function getReportClusterStyle(feature: Feature, reportSource: ReportSource): Style {
  const features = feature.get('features') as Feature[] | undefined;

  if (features && features.length > 1) {
    return createReportsClusterStyle(features.length);
  }

  return reportSource.getStatusStyle(feature);
}

function getOrCreateSignalementGroup(map: OlMap): LayerGroup {
  const existingGroup = findLayerGroupByName(map, SIGNAL_GROUP_NAME);
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

function shouldLoadNextReportsPage(status: number, contentRange: unknown): boolean {
  if (status !== 206 || typeof contentRange !== 'string') {
    return false;
  }

  const [range, total] = contentRange.split('/');
  const [, end] = range.split('-');

  return Boolean(end && total && end !== total);
}

async function loadCommunityReports(extent: Extent, communityId: number, page = 1): Promise<Report[]> {
  const response = await collabApiClient.report.getAll({
    box: extent.join(','),
    limit: 100,
    page,
    communities: [communityId],
  });

  const reports = response.data as Report[];
  if (shouldLoadNextReportsPage(response.status, response.headers?.['content-range'])) {
    const nextReports = await loadCommunityReports(extent, communityId, page + 1);
    return reports.concat(nextReports);
  }

  return reports;
}

export function useSignalementMapLayers(
  mapRef: RefObject<OlMap | null>,
  signalementLayerState: SignalementLayerState,
  isSignalementGroupVisible: boolean,
  isMapReady: boolean,
  mode: OfflineMode
) {
  const { activeCommunity } = useCommunity();
  const isOfflineMode = mode === 'offline';

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

    const remoteReportsSource = isOfflineMode
      ? new VectorSource()
      : new VectorSource({
        strategy: bboxStrategy,
        loader: async (extent, _resolution, projection, success, failure) => {
          try {
            const mapProjectionCode = (projection as Projection).getCode();
            const extent4326 = transformExtent(
              extent,
              mapProjectionCode,
              WGS84_PROJECTION
            );
            const reports = activeCommunity?.id
              ? await loadCommunityReports(extent4326, activeCommunity.id)
              : [];
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
      style: (feature) => getReportClusterStyle(feature as Feature, reportSource),
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

        const localFeatures = createLocalReportFeatures(reports as Report[]);
        const localSketchFeatures = createLocalReportsSketchFeatures(reports as Report[]);
        myReportsSource.clear(true);
        myReportsSource.addFeatures(localFeatures);
        croquisSource.clear(true);
        croquisSource.addFeatures(localSketchFeatures);
      } catch (error) {
        console.error('[Signalements] Failed to load local reports layer', error);
      }
    };

    loadLocalReports();

    return () => {
      cancelled = true;
    };
  }, [activeCommunity?.id, isMapReady, isOfflineMode, mapRef]);

  useEffect(() => {
    if (!isMapReady) return;

    const map = mapRef.current;
    if (!map) return;

    const signalementGroup = findLayerGroupByName(map, SIGNAL_GROUP_NAME);
    if (!signalementGroup) return;

    const visibilityByLayerName = new Map<string, boolean>([
      [
        LAYER_NAME_MES_SIGNALEMENTS,
        isSignalementGroupVisible &&
          signalementLayerState.visibility[SIGNAL_LAYER_KEYS.mesSignalements],
      ],
      [
        LAYER_NAME_CROQUIS,
        isSignalementGroupVisible &&
          signalementLayerState.visibility[SIGNAL_LAYER_KEYS.croquis],
      ],
      [
        LAYER_NAME_SIGNALEMENTS,
        isSignalementGroupVisible &&
          signalementLayerState.visibility[SIGNAL_LAYER_KEYS.signalements],
      ],
    ]);
    const opacityByLayerName = new Map<string, number>([
      [
        LAYER_NAME_MES_SIGNALEMENTS,
        signalementLayerState.opacity[SIGNAL_LAYER_KEYS.mesSignalements],
      ],
      [LAYER_NAME_CROQUIS, signalementLayerState.opacity[SIGNAL_LAYER_KEYS.croquis]],
      [
        LAYER_NAME_SIGNALEMENTS,
        signalementLayerState.opacity[SIGNAL_LAYER_KEYS.signalements],
      ],
    ]);
    const normalizedSignalementLayerOrder = normalizeSignalementLayerOrder(
      signalementLayerState.order
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
    isSignalementGroupVisible,
    mapRef,
    signalementLayerState,
  ]);
}
