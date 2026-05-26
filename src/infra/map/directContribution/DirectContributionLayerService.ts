import {
  CollabVectorLayer,
  CollabVectorSource,
  ReportStatus,
} from '@ign/mobile-core';

import type Map from 'ol/Map';
import type Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import MultiPolygon from 'ol/geom/MultiPolygon';
import Polygon from 'ol/geom/Polygon';
import { getCenter } from 'ol/extent';
import { transform } from 'ol/proj';

import type { AppReport } from '@/domain/report/models';
import type {
  DirectContributionConflict,
  DirectContributionConflictObject,
  DirectContributionConflictResolutionSelection,
} from '@/domain/community/directContributionConflicts';

import { AppError } from '@/shared/errors/appError';

import { WEB_MERCATOR_PROJECTION, WGS84_PROJECTION } from '@/shared/constants/projections';

import { ReportStorageAdapter } from '@/infra/storage';
import { findLayerGroupByName } from '@/infra/map/openlayers/layerGroups';
import { getCommunityLayerKeyFromOlLayer } from '@/infra/map/openlayers/layerMetadata';

import { applyReportObjectMetadata } from '@/features/report/utils/reportObjects';

const GUICHET_LAYER_GROUP_NAME = 'guichet';
const DIRECT_CONTRIBUTION_SOURCE_EVENT_TYPES = ['editchange', 'saveend'] as const;
const reportStorage = new ReportStorageAdapter();

type ObservableCollabVectorSource = CollabVectorSource & {
  on(type: string, listener: (event: unknown) => void): void;
  un(type: string, listener: (event: unknown) => void): void;
};

type DirectContributionPendingFeature = Feature<Geometry> & {
  updates?: Record<string, boolean>;
  state?: string;
};

type WktFormatter = {
  writeGeometry: (geometry: Geometry, options?: unknown) => string;
};

interface DirectContributionConflictResolutionOptions {
  communityId: number;
}

interface DirectContributionConflictLocalData {
  localObject?: Record<string, unknown>;
  locallyUpdatedFieldNames?: string[];
}

interface PreparedConflictResolution {
  choice: 'force' | 'delete' | 'report';
  conflictObject: DirectContributionConflictObject;
  pendingFeature: DirectContributionPendingFeature;
}

/**
 * Resolves the feature identifier from either the table id property or the OpenLayers feature id, depending on how the feature is currently exposed.
 */
function getFeatureIdentifier(
  feature: Feature,
  idName: string
): string | number | undefined {
  const propertyId = feature.get(idName);
  if (typeof propertyId === 'string' || typeof propertyId === 'number') {
    return propertyId;
  }

  const featureId = feature.getId();
  if (typeof featureId === 'string' || typeof featureId === 'number') {
    return featureId;
  }

  return undefined;
}

function getPendingDraftFeatures(
  source: CollabVectorSource
): DirectContributionPendingFeature[] {
  return [
    ...source.updatedFeatures.getArray(),
    ...source.deletedFeatures.getArray(),
    ...source.insertedFeatures.getArray(),
  ] as DirectContributionPendingFeature[];
}

/**
 * Returns the local draft feature that matches one object id among the unsent updates, deletions and creations tracked by the collaborative source.
 */
function findPendingDraftFeature(
  source: CollabVectorSource,
  idName: string,
  objectId: string | number
): DirectContributionPendingFeature | null {
  const pendingDraftFeatures = getPendingDraftFeatures(source);

  for (const pendingDraftFeature of pendingDraftFeatures) {
    const pendingFeatureId = getFeatureIdentifier(pendingDraftFeature, idName);
    if (pendingFeatureId !== undefined && String(pendingFeatureId) === String(objectId)) {
      return pendingDraftFeature;
    }
  }

  return null;
}

/**
 * Removes a feature from one collaborative draft collection when it is currently present there.
 */
function removeFeatureFromCollection(
  sourceCollection: {
    getArray(): Feature[];
    removeAt(index: number): void;
  },
  feature: Feature
): boolean {
  const featureIndex = sourceCollection.getArray().indexOf(feature);
  if (featureIndex < 0) {
    return false;
  }

  sourceCollection.removeAt(featureIndex);
  return true;
}

/**
 * Clears a pending feature from the collaborative source and resets its local draft markers so it no longer counts as an unsent change.
 */
function removePendingFeatureFromSource(
  source: CollabVectorSource,
  feature: DirectContributionPendingFeature
): boolean {
  const wasRemoved =
    removeFeatureFromCollection(source.insertedFeatures, feature) ||
    removeFeatureFromCollection(source.deletedFeatures, feature) ||
    removeFeatureFromCollection(source.updatedFeatures, feature);

  if (!wasRemoved) {
    return false;
  }

  feature.updates = {};
  delete feature.state;
  return true;
}

function getTableGeometryType(source: CollabVectorSource): string {
  const table = source.getTable();
  const geometryColumn = table.columns[table.geometryName] as { type: string };

  return geometryColumn.type;
}

function getGeometryForPolygonSubmit(geometry: Geometry): Geometry {
  // Surface layers are drawn as Polygon, while the collaborative backend stores them in MultiPolygon columns.
  if (geometry.getType() === 'Polygon') {
    return new MultiPolygon([(geometry as Polygon).getCoordinates()]);
  }

  return geometry;
}

function patchWktFormatterForPolygonSubmit(source: CollabVectorSource): () => void {
  const tableGeometryType = getTableGeometryType(source);
  if (!/polygon/i.test(tableGeometryType)) {
    return () => undefined;
  }

  const formatWKT = source.localProperties.formatWKT as WktFormatter;
  const originalWriteGeometry = formatWKT.writeGeometry;

  const patchedWriteGeometry = function (
    this: WktFormatter,
    geometry: Geometry,
    options?: unknown
  ) {
    return originalWriteGeometry.call(
      this,
      getGeometryForPolygonSubmit(geometry),
      options
    );
  };
  formatWKT.writeGeometry = patchedWriteGeometry;

  return () => {
    formatWKT.writeGeometry = originalWriteGeometry;
  };
}

/**
 * Converts the conflicted object geometry into the point WKT expected by the legacy "Signaler" flow, which creates a point-based report draft.
 */
function getConflictReportPointWkt(feature: Feature<Geometry>): string {
  const geometry = feature.getGeometry();
  if (!geometry) {
    throw new AppError({
      kind: 'validation',
      message: 'Impossible de créer un signalement sans géométrie.',
    });
  }

  // Legacy signalements generated from conflicts use a simple point derived from the conflicted object geometry, not the full object geometry itself.
  const featureGeometry = geometry as Geometry & {
    getFirstCoordinate?: () => number[];
  };
  const anchor = typeof featureGeometry.getFirstCoordinate === 'function'
    ? featureGeometry.getFirstCoordinate()
    : getCenter(geometry.getExtent());
  const [longitude, latitude] = transform(
    anchor,
    WEB_MERCATOR_PROJECTION,
    WGS84_PROJECTION
  );

  return `POINT(${longitude} ${latitude})`;
}

/**
 * Creates the local report draft persisted when a conflict is turned into a report instead of staying in direct contribution.
 */
function cloneConflictFeatureForReport(
  feature: Feature<Geometry>,
  conflict: DirectContributionConflict,
  conflictObject: DirectContributionConflictObject
): Feature<Geometry> {
  const reportFeature = feature.clone();
  const featureId = feature.getId();
  if (featureId !== undefined && featureId !== null) {
    reportFeature.setId(featureId);
  }

  applyReportObjectMetadata(reportFeature, {
    key: conflictObject.key,
    label: conflictObject.objectLabel,
    layerTitle: conflict.layerTitle,
    layerName: conflict.layerKey,
  });

  return reportFeature;
}

/**
 * Resolves direct contribution actions from a UI layer key to the underlying collaborative OpenLayers layer and source mounted on the map.
 */
export class DirectContributionLayerService {
  private readonly map: Map;

  constructor(map: Map) {
    this.map = map;
  }

  /**
   * Subscribes to collaborative draft events so the UI refreshes badges only when the local edit state actually changes.
   */
  public observeLayers(onChange: () => void): () => void {
    const guichet = findLayerGroupByName(this.map, GUICHET_LAYER_GROUP_NAME);
    if (!guichet) {
      return () => undefined;
    }

    const cleanupTasks: Array<() => void> = [];
    const groupLayers = guichet.getLayers();
    let sourceCleanupTasks: Array<() => void> = [];

    const bindLayerSources = () => {
      for (const cleanup of sourceCleanupTasks) {
        cleanup();
      }
      sourceCleanupTasks = [];

      for (const layer of this.listLayers()) {
        const source = layer.getSource() as ObservableCollabVectorSource | null;
        if (!source) {
          continue;
        }

        for (const eventType of DIRECT_CONTRIBUTION_SOURCE_EVENT_TYPES) {
          source.on(eventType, onChange);
          sourceCleanupTasks.push(() => {
            source.un(eventType, onChange);
          });
        }
      }
    };

    const handleLayerGroupChange = () => {
      bindLayerSources();
      onChange();
    };

    bindLayerSources();

    groupLayers.on('add', handleLayerGroupChange);
    groupLayers.on('remove', handleLayerGroupChange);
    cleanupTasks.push(() => {
      groupLayers.un('add', handleLayerGroupChange);
      groupLayers.un('remove', handleLayerGroupChange);
    });

    return () => {
      for (const cleanup of sourceCleanupTasks) {
        cleanup();
      }
      for (const cleanup of cleanupTasks) {
        cleanup();
      }
    };
  }

  /**
   * Returns the number of unsent local edits currently tracked by one collaborative source. Missing layers are treated as empty.
   */
  public getPendingChangesCount(layerKey: string): number {
    const source = this.getSource(layerKey);
    if (!source) {
      return 0;
    }

    return Math.max(0, source.getPendingChangesCount());
  }

  /**
   * Builds the badge state consumed by the layers panel for a whole set of collaborative layer keys.
   */
  public getPendingChangesCountByLayerKeys(
    layerKeys: string[]
  ): Record<string, number> {
    const countsByLayerKey: Record<string, number> = {};

    for (const layerKey of layerKeys) {
      countsByLayerKey[layerKey] = this.getPendingChangesCount(layerKey);
    }

    return countsByLayerKey;
  }

  /**
   * Returns the local draft snapshot currently associated with one conflicted
   * object so the conflict UI can compare local values and server values.
   */
  public getConflictLocalData(
    layerKey: string,
    idName: string,
    objectId: string | number
  ): DirectContributionConflictLocalData {
    const source = this.getSource(layerKey);
    if (!source) {
      return {};
    }
    const pendingFeature = findPendingDraftFeature(source, idName, objectId);
    if (!pendingFeature) {
      return {};
    }

    return {
      localObject: pendingFeature.getProperties(),
      locallyUpdatedFieldNames: Object.keys(pendingFeature.updates ?? {}),
    };
  }

  /**
   * Exposes the live collaborative layer instance mounted on the map for one community layer key.
   */
  public getCollabLayer(layerKey: string): CollabVectorLayer | undefined {
    return this.getLayer(layerKey);
  }

  /**
   * Exposes the live collaborative source mounted on the map for one community layer key.
   */
  public getCollabSource(layerKey: string): CollabVectorSource | undefined {
    return this.getSource(layerKey);
  }

  /**
   * Discards one layer draft from the collaborative source.
   */
  public resetLayerChanges(layerKey: string): void {
    this.getSource(layerKey)?.resetChanges();
  }

  /**
   * Sends one layer draft to the collaborative backend.
   */
  public async submitLayerChanges(layerKey: string): Promise<unknown> {
    const source = this.getSource(layerKey);
    if (!source) {
      throw new AppError({
        kind: 'unknown',
        message: `Impossible de retrouver la couche collaborative "${layerKey}".`,
      });
    }

    const restoreWktFormatter = patchWktFormatterForPolygonSubmit(source);
    try {
      return await source.submitChanges();
    } finally {
      restoreWktFormatter();
    }
  }

  /**
   * Applies the legacy conflict actions on one collaborative source, then persists the updated draft state and reloads the layer.
   */
  public async applyConflictResolutions(
    conflict: DirectContributionConflict,
    selection: DirectContributionConflictResolutionSelection,
    options: DirectContributionConflictResolutionOptions
  ): Promise<{ createdReportCount: number }> {
    const source = this.getSource(conflict.layerKey);
    if (!source) {
      throw new AppError({
        kind: 'unknown',
        message: `Impossible de retrouver la couche collaborative "${conflict.layerKey}".`,
      });
    }

    const reportDrafts: AppReport[] = [];
    const reportTheme = selection.reportTheme;
    let reportIdSeed = Date.now();
    const preparedResolutions: PreparedConflictResolution[] = [];

    const hasReportResolutions = Object.values(selection.resolutionsByConflictKey).some((choice) => choice === 'report');
    if (hasReportResolutions) {
      if (!reportTheme) {
        throw new AppError({
          kind: 'validation',
          message: 'Un thème est requis pour créer un signalement.',
        });
      }
    }

    // Validate everything first so we do not leave the local draft partially updated if one conflicted object cannot be processed.
    for (const conflictObject of conflict.conflicts) {
      const resolutionChoice = selection.resolutionsByConflictKey[conflictObject.key];
      if (!resolutionChoice) {
        throw new AppError({
          kind: 'validation',
          message: 'Chaque conflit doit avoir une action de résolution.',
        });
      }

      // A conflict can only be resolved from an existing local draft.
      const pendingFeature = findPendingDraftFeature(
        source,
        conflict.idName,
        conflictObject.objectId
      )!;

      if (resolutionChoice === 'force') {
        if (!conflictObject.serverFingerprint) {
          throw new AppError({
            kind: 'validation',
            message: `Impossible de forcer ${conflictObject.objectLabel} sans empreinte serveur.`,
          });
        }
      }

      preparedResolutions.push({
        choice: resolutionChoice,
        conflictObject,
        pendingFeature,
      });
    }

    // Apply the validated actions, then persist the new collaborative draft.
    for (const resolution of preparedResolutions) {
      switch (resolution.choice) {
        case 'force': {
          const pendingFeature = resolution.pendingFeature;

          pendingFeature.set(
            'gcms_fingerprint',
            resolution.conflictObject.serverFingerprint,
            true
          );
          pendingFeature.updates = {
            ...(pendingFeature.updates ?? {}),
            gcms_fingerprint: true,
          };
          break;
        }

        case 'delete': {
          removePendingFeatureFromSource(source, resolution.pendingFeature);
          break;
        }

        case 'report': {
          const pendingFeature = resolution.pendingFeature;

          removePendingFeatureFromSource(source, pendingFeature);
          reportDrafts.push(
            {
              id: reportIdSeed++,
              communityId: options.communityId,
              themeId: 0,
              geometry: getConflictReportPointWkt(pendingFeature),
              comment: resolution.conflictObject.objectLabel,
              attributes: {
                themeName: reportTheme,
              },
              status: ReportStatus.Draft,
              createdAt: new Date(),
              modifiedAt: new Date(),
              features: [
                cloneConflictFeatureForReport(
                  pendingFeature,
                  conflict,
                  resolution.conflictObject
                ),
              ],
            } satisfies AppReport
          );
          break;
        }
      }
    }

    await Promise.all(
      reportDrafts.map((reportDraft) => reportStorage.saveReport(reportDraft))
    );

    source.writeChanges(true);
    source.reload();

    return {
      createdReportCount: reportDrafts.length,
    };
  }

  private listLayers(): CollabVectorLayer[] {
    const guichet = findLayerGroupByName(this.map, GUICHET_LAYER_GROUP_NAME);
    if (!guichet) {
      return [];
    }

    return guichet
      .getLayers()
      .getArray()
      .filter((layer): layer is CollabVectorLayer => layer instanceof CollabVectorLayer)
      .filter((layer) => typeof getCommunityLayerKeyFromOlLayer(layer) === 'string');
  }

  private getLayer(layerKey: string): CollabVectorLayer | undefined {
    return this.listLayers().find((layer) => getCommunityLayerKeyFromOlLayer(layer) === layerKey);
  }

  private getSource(layerKey: string): CollabVectorSource | undefined {
    return this.getLayer(layerKey)?.getSource() ?? undefined;
  }
}
