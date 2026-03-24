import { toRawObject, toStringValue } from '@/shared/utils/coercion';

const TECHNICAL_CONFLICT_FIELD_NAMES = new Set([
  'gcms_fingerprint',
  'geometry',
]);

export type DirectContributionConflictResolutionChoice =
  | 'force'
  | 'delete'
  | 'report';

export type DirectContributionConflictFieldState =
  | 'same'
  | 'equal'
  | 'different';

export interface DirectContributionConflictContext {
  layerKey: string;
  layerTitle?: string;
  idName: string;
}

export interface DirectContributionConflictFieldDiff {
  name: string;
  localValue: unknown;
  serverValue: unknown;
  state: DirectContributionConflictFieldState;
  isLocallyUpdated: boolean;
}

export interface DirectContributionConflictObject {
  key: string;
  objectId: string | number;
  objectLabel: string;
  serverFingerprint?: string;
  localObject?: Record<string, unknown>;
  locallyUpdatedFieldNames?: string[];
  serverObject: Record<string, unknown>;
  resolutionChoice?: DirectContributionConflictResolutionChoice;
}

export interface DirectContributionConflict {
  layerKey: string;
  layerTitle?: string;
  idName: string;
  conflicts: DirectContributionConflictObject[];
}

function getConflictFieldState(
  localValue: unknown,
  serverValue: unknown
): DirectContributionConflictFieldState {
  // strict equality first
  if (localValue === serverValue) {
    return 'same';
  }
  // then non-strict equality for values such as 4 vs '4'
  if (localValue == serverValue) {
    return 'equal';
  }
  return 'different';
}

function getConflictFieldNames(
  localObject: Record<string, unknown> | null | undefined,
  serverObject: Record<string, unknown>
): string[] {
  // Legacy compares the fields present on the local feature first. If the local feature cannot be found, fall back to the server object.
  const fieldNames = localObject
    ? Object.keys(localObject)
    : Object.keys(serverObject);

  return fieldNames.filter((fieldName) => {
    return !TECHNICAL_CONFLICT_FIELD_NAMES.has(fieldName);
  });
}

/**
 * Parses the raw backend transaction returned by 'submitChanges()' when the collaborative API reports `status = conflicting`.
 */
export function parseDirectContributionConflict(
  transaction: unknown,
  context: DirectContributionConflictContext
): DirectContributionConflict | null {
  const rawTransaction = toRawObject(transaction);
  if (!rawTransaction) {
    return null;
  }

  const status = toStringValue(rawTransaction.status);
  const rawConflicts = rawTransaction.conflicts;
  if (!Array.isArray(rawConflicts) || (status && status !== 'conflicting')) {
    return null;
  }

  const conflicts: DirectContributionConflictObject[] = [];

  for (const rawConflict of rawConflicts) {
    const conflictRecord = toRawObject(rawConflict);
    if (!conflictRecord) {
      continue;
    }

    const serverObject = toRawObject(conflictRecord.server_object);
    if (!serverObject) {
      continue;
    }

    const objectId = serverObject[context.idName];
    if (typeof objectId !== 'string' && typeof objectId !== 'number') {
      continue;
    }

    conflicts.push({
      key: `${context.layerKey}:${objectId}`,
      objectId,
      objectLabel: `${context.idName}: ${objectId}`,
      serverFingerprint: toStringValue(serverObject.gcms_fingerprint),
      serverObject,
    });
  }

  if (conflicts.length === 0) {
    return null;
  }

  return {
    layerKey: context.layerKey,
    layerTitle: context.layerTitle,
    idName: context.idName,
    conflicts,
  };
}

/**
 * Builds the field-by-field comparison shown in the conflict UI from one local object and the server object returned by the backend.
 */
export function getDirectContributionConflictFieldDiffs(
  localObject: Record<string, unknown> | null | undefined,
  conflictObject: DirectContributionConflictObject,
  locallyUpdatedFieldNames: string[] = []
): DirectContributionConflictFieldDiff[] {
  const locallyUpdatedFieldNameSet = new Set(locallyUpdatedFieldNames);

  return getConflictFieldNames(localObject, conflictObject.serverObject).map(
    (fieldName) => {
      const localValue = localObject?.[fieldName];
      const serverValue = conflictObject.serverObject[fieldName];

      return {
        name: fieldName,
        localValue,
        serverValue,
        state: getConflictFieldState(localValue, serverValue),
        isLocallyUpdated: locallyUpdatedFieldNameSet.has(fieldName),
      };
    }
  );
}
