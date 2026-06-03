import type { CommunityLayer, Geoservice } from '@ign/mobile-core';
import WMSCapabilities from 'ol/format/WMSCapabilities';
import { containsCoordinate } from 'ol/extent';
import { fromLonLat, transformExtent } from 'ol/proj';

import {
  WEB_MERCATOR_PROJECTION,
  WGS84_PROJECTION,
} from '@/shared/constants/projections';
import { DEFAULT_MAP_CENTER_LON_LAT } from '@/shared/constants/map';
import type {
  RemoteWmsLayer,
  UserWmsLayer,
} from '@/features/map/types/userWmsLayers';

const USER_WMS_LAYER_ID_OFFSET = 1_000_000;

const WMS_PREVIEW_SIZE = 256;
const WMS_PREVIEW_RESOLUTION = 150;
const WMS_PREVIEW_DEFAULT_CENTER: [number, number] = DEFAULT_MAP_CENTER_LON_LAT;

interface WmsCapabilityLayer {
  Name?: string;
  Title?: string;
  Abstract?: string;
  CRS?: string[];
  SRS?: string[];
  Style?: Array<{
    LegendURL?: Array<{
      OnlineResource?: string;
    }>;
  }>;
  Layer?: WmsCapabilityLayer[];
  BoundingBox?: Array<{
    crs?: string;
    srs?: string;
    extent?: number[];
  }>;
  EX_GeographicBoundingBox?: number[];
}

type NamedWmsCapabilityLayer = WmsCapabilityLayer & {
  Name: string;
};

interface WmsCapabilitiesDocument {
  version: string;
  Capability: {
    Request: {
      GetMap: {
        Format: string[];
        DCPType: Array<{
          HTTP: {
            Get: {
              OnlineResource: string;
            };
          };
        }>;
      };
    };
    Layer: WmsCapabilityLayer;
  };
}

function getMapParameter(url: string): string | undefined {
  const parsedUrl = new URL(url);
  for (const [key, value] of parsedUrl.searchParams.entries()) {
    if (/^map$/i.test(key)) {
      return value;
    }
  }

  return undefined;
}

/** Builds the capabilities request from the service URL entered by the user. */
function getCapabilitiesUrl(url: string): string {
  const parsedUrl = new URL(url);
  parsedUrl.searchParams.set('SERVICE', 'WMS');
  parsedUrl.searchParams.set('REQUEST', 'GetCapabilities');
  return parsedUrl.toString();
}

function getPreferredFormat(formats: string[]): string {
  const preferredFormat = formats.find((format) => /png/i.test(format))
    ?? formats.find((format) => /jpeg/i.test(format))
    ?? formats.find((format) => /gif/i.test(format));

  return preferredFormat ?? formats[0];
}

/** Reads the geographic extent used to center the preview image. */
function getLayerExtent(layer: WmsCapabilityLayer): number[] | undefined {
  if (layer.EX_GeographicBoundingBox) {
    return layer.EX_GeographicBoundingBox;
  }

  const geographicBoundingBox = layer.BoundingBox?.find((boundingBox) => {
    const projection = boundingBox.crs ?? boundingBox.srs ?? '';
    return projection === 'CRS:84' || projection === WGS84_PROJECTION;
  });

  return geographicBoundingBox?.extent;
}

function getLayerProjection(layer: WmsCapabilityLayer): string {
  const projections = layer.CRS ?? layer.SRS ?? [];
  if (projections.includes(WEB_MERCATOR_PROJECTION)) {
    return WEB_MERCATOR_PROJECTION;
  }
  if (projections.includes('EPSG:900913')) {
    return 'EPSG:900913';
  }
  if (projections.includes(WGS84_PROJECTION)) {
    return WGS84_PROJECTION;
  }

  return projections[0] ?? WEB_MERCATOR_PROJECTION;
}

/** Extracts legend image URLs displayed next to the WMS preview. */
function getLegend(layer: WmsCapabilityLayer): string[] | undefined {
  const legend = layer.Style
    ?.flatMap((style) => style.LegendURL ?? [])
    .map((legendUrl) => legendUrl.OnlineResource as string);

  return legend && legend.length > 0 ? legend : undefined;
}

/** Creates the GetMap URL used only for the dialog preview image. */
function getPreviewUrl({
  url,
  layerName,
  version,
  format,
  projection,
  map,
  geographicExtent,
}: {
  url: string;
  layerName: string;
  version: string;
  format: string;
  projection: string;
  map?: string;
  geographicExtent?: number[];
}): string {
  const defaultCenter = fromLonLat(WMS_PREVIEW_DEFAULT_CENTER) as [number, number];
  const projectedExtent = geographicExtent
    ? transformExtent(
        geographicExtent,
        WGS84_PROJECTION,
        WEB_MERCATOR_PROJECTION
      ) as [number, number, number, number]
    : undefined;
  const center = projectedExtent && !containsCoordinate(
    projectedExtent,
    defaultCenter
  )
    ? [
        (projectedExtent[0] + projectedExtent[2]) / 2,
        (projectedExtent[1] + projectedExtent[3]) / 2,
      ]
    : defaultCenter;
  const halfSize = WMS_PREVIEW_SIZE * WMS_PREVIEW_RESOLUTION / 2;
  const previewExtent = [
    center[0] - halfSize,
    center[1] - halfSize,
    center[0] + halfSize,
    center[1] + halfSize,
  ];
  let bbox = previewExtent;

  if (projection === WGS84_PROJECTION || projection === 'CRS:84') {
    bbox = transformExtent(
      previewExtent,
      WEB_MERCATOR_PROJECTION,
      WGS84_PROJECTION
    );
  }

  const parsedUrl = new URL(url);
  parsedUrl.searchParams.set('SERVICE', 'WMS');
  parsedUrl.searchParams.set('REQUEST', 'GetMap');
  parsedUrl.searchParams.set('LAYERS', layerName);
  parsedUrl.searchParams.set('STYLES', '');
  parsedUrl.searchParams.set('FORMAT', format);
  parsedUrl.searchParams.set('TRANSPARENT', 'TRUE');
  parsedUrl.searchParams.set('VERSION', version);
  parsedUrl.searchParams.set('WIDTH', String(WMS_PREVIEW_SIZE));
  parsedUrl.searchParams.set('HEIGHT', String(WMS_PREVIEW_SIZE));
  parsedUrl.searchParams.set(
    'BBOX',
    version === '1.3.0' && projection === WGS84_PROJECTION
      ? [bbox[1], bbox[0], bbox[3], bbox[2]].join(',')
      : bbox.join(',')
  );

  if (version === '1.3.0') {
    parsedUrl.searchParams.set('CRS', projection);
  } else {
    parsedUrl.searchParams.set('SRS', projection);
  }

  if (map) {
    parsedUrl.searchParams.set('MAP', map);
  }

  return parsedUrl.toString();
}

/** Returns every selectable named layer from the nested capabilities tree. */
function flattenCapabilityLayers(layer: WmsCapabilityLayer): NamedWmsCapabilityLayer[] {
  const children = layer.Layer?.flatMap(flattenCapabilityLayers) ?? [];
  return layer.Name ? [layer as NamedWmsCapabilityLayer, ...children] : children;
}

/** Fetches and maps remote WMS capabilities to the dialog list model. */
export async function fetchRemoteWmsLayers(url: string): Promise<RemoteWmsLayer[]> {
  const response = await fetch(getCapabilitiesUrl(url));

  if (!response.ok) {
    throw new Error('WMS capabilities request failed');
  }

  const rawCapabilities = await response.text();
  const capabilities = new WMSCapabilities().read(rawCapabilities) as WmsCapabilitiesDocument;
  const getMap = capabilities.Capability.Request.GetMap;
  const format = getPreferredFormat(getMap.Format);
  const version = capabilities.version;
  const mapUrl = getMap.DCPType[0].HTTP.Get.OnlineResource;
  const mapParameter = getMapParameter(url);

  return flattenCapabilityLayers(capabilities.Capability.Layer).map((layer) => {
    const layerName = layer.Name;

    return {
      title: layer.Title ?? layer.Name,
      description: layer.Abstract,
      layerName,
      url: mapUrl,
      map: mapParameter,
      legend: getLegend(layer),
      previewUrl: getPreviewUrl({
        url: mapUrl,
        layerName,
        version,
        format,
        projection: getLayerProjection(layer),
        map: mapParameter,
        geographicExtent: getLayerExtent(layer),
      }),
    };
  });
}

/** Creates the persisted user WMS layer after the user loads a remote layer. */
export function createUserWmsLayer(
  remoteLayer: RemoteWmsLayer,
  existingUserLayers: UserWmsLayer[]
): UserWmsLayer {
  const maxId = existingUserLayers.reduce(
    (currentMax, layer) => Math.max(currentMax, layer.id),
    0
  );

  return {
    id: maxId + 1,
    title: remoteLayer.title,
    description: remoteLayer.description,
    url: remoteLayer.url,
    layerName: remoteLayer.layerName,
    map: remoteLayer.map,
    visible: true,
    opacity: 1,
  };
}

export function isUserWmsCommunityLayer(layer: CommunityLayer): boolean {
  return layer.id >= USER_WMS_LAYER_ID_OFFSET && layer.geoservice?.type === 'WMS';
}

export function getUserWmsLayerIdFromCommunityLayer(layer: CommunityLayer): number {
  return layer.id - USER_WMS_LAYER_ID_OFFSET;
}

/** Converts a persisted user WMS layer to the shared community layer shape. */
export function userWmsLayerToCommunityLayer(layer: UserWmsLayer): CommunityLayer {
  const geoservice: Geoservice = {
    id: layer.id,
    title: layer.title,
    description: layer.description,
    url: layer.url,
    type: 'WMS',
    layers: layer.layerName,
    ...(layer.map ? { map: layer.map } : {}),
  };

  return {
    id: USER_WMS_LAYER_ID_OFFSET + layer.id,
    title: layer.title,
    visible: layer.visible ?? true,
    opacity: layer.opacity ?? 1,
    geoservice,
  };
}
