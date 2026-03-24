import type { Table, TableColumn } from '@ign/mobile-core';
import type Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import {
  toRawObject,
  toStringArrayFieldValue,
  toStringFieldValue,
  type FormFieldValue,
} from '@/shared/utils/coercion';
import { getExifOriginalDate } from '@/shared/utils/exif';

type SelectValues = string[] | Record<string, string | number | boolean | null>;
type TranslationFn = (key: string, options?: Record<string, unknown>) => string;

type DirectContributionFieldConstraintType = 'mapping' | 'regex' | 'document' | string;

type DirectContributionTableColumn = Omit<TableColumn, 'type'> & {
  type: string;
  readOnly?: boolean;
  selectValues?: SelectValues;
  placeholder?: string;
  nullable?: boolean;
  mandatory?: boolean;
  description?: string;
  automatic?: boolean;
  computed?: boolean;
  minLength?: number;
  maxLength?: number;
  minValue?: number | string;
  maxValue?: number | string;
  pattern?: string;
  customId?: boolean;
  multiple?: boolean;
  mimeTypes?: string;
  jsonSchema?: Record<string, unknown>;
  conditionField?: string;
  constraint?: Record<string, unknown>;
  jeuxAttributs?: Record<string, unknown>;
};
type DirectContributionFieldKind = 'text' | 'number' | 'date' | 'datetime' | 'month' | 'year' | 'select' | 'multiselect' | 'document' | 'like' | 'json';

export interface DirectContributionFieldConstraint {
  type: DirectContributionFieldConstraintType;
  regex?: string;
  mapping?: Record<string, string[]>;
  value?: string;
}

export interface DirectContributionDocumentDraftFile {
  name: string;
  mimeType?: string | null;
  contentBase64: string;
}

export interface DirectContributionDocumentValue {
  kind: 'document';
  documentId: string | null;
  file: File | DirectContributionDocumentDraftFile | null;
  removed: boolean;
}
export interface DirectContributionLikeValue {
  kind: 'like';
  cnt: number;
  userid: number | null;
  validDate: string | null;
}
export type DirectContributionFieldValue = FormFieldValue<
  DirectContributionDocumentValue | DirectContributionLikeValue
>;
export interface DirectContributionFieldOption {
  value: string;
  label: string;
}
export interface DirectContributionFieldDefinition {
  name: string;
  label: string;
  kind: DirectContributionFieldKind;
  legacyType: string;
  required: boolean;
  nullable: boolean;
  disabled: boolean;
  placeholder?: string;
  description?: string;
  options?: DirectContributionFieldOption[];
  multiple?: boolean;
  accept?: string;
  min?: number | string;
  max?: number | string;
  step?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  jsonSchema?: Record<string, unknown>;
  defaultValue?: unknown;
  // Legacy dependent fields declare which other field drives their state.
  // Example: a "subtype" field can depend on the current value of a "type" field.
  conditionField?: string;
  // The constraint explains how the dependency works for that field:
  // - mapping: filter the allowed options from the controller value
  // - regex: enable/disable the field depending on a pattern match
  // - document: derive metadata fields from the selected file
  constraint?: DirectContributionFieldConstraint;
  // jeuxAttributs is a different mechanism: the current field does not depend on
  // another one, it pushes preset values into other fields when its own value changes.
  jeuxAttributs?: Record<string, string | number | boolean | null>;
}
export interface DirectContributionResolvedFieldDefinition extends DirectContributionFieldDefinition {
  disabled: boolean;
  options?: DirectContributionFieldOption[];
}
interface DirectContributionFieldValidationContext {
  t: TranslationFn;
}
interface DirectContributionFieldValidationResult {
  normalizedValue: unknown;
  error?: string;
}
const BOOLEAN_TRUE_VALUES = ['1', 'true', 't', 'vrai', 'oui'];
const BOOLEAN_FALSE_VALUES = ['0', 'false', 'f', 'faux', 'non'];
const LEGACY_SELECT_COMPATIBLE_TYPES = new Set([
  'date',
  'datetime',
  'year',
  'yearmonth',
  'string',
  'text',
  'integer',
  'int',
  'double',
  'number',
]);

function getColumnType(column: DirectContributionTableColumn): string {
  return column.type.trim().length > 0
    ? column.type.toLowerCase()
    : 'string';
}

function isBooleanLegacyType(type: string): boolean {
  return type === 'boolean' || type === 'checkbox';
}

function isIntegerLegacyType(type: string): boolean {
  return type === 'integer' || type === 'int';
}

function getColumnLabel(columnName: string, column: DirectContributionTableColumn): string {
  return typeof column.title === 'string' && column.title.trim().length > 0
    ? column.title
    : columnName;
}
function getColumnOptions(column: DirectContributionTableColumn): DirectContributionFieldOption[] {
  if (!column.selectValues) {
    return [];
  }
  if (Array.isArray(column.selectValues)) {
    return column.selectValues.map((value) => ({
      value: value == null ? '' : String(value),
      label: value == null ? '' : String(value),
    }));
  }
  return Object.entries(column.selectValues).map(([label, value]) => ({
    label,
    value: value == null ? '' : String(value),
  }));
}

function getConstraintMapping(
  candidateMapping: unknown
): Record<string, string[]> | undefined {
  if (
    !candidateMapping ||
    typeof candidateMapping !== 'object' ||
    Array.isArray(candidateMapping)
  ) {
    return undefined;
  }

  const normalizedMapping: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(candidateMapping)) {
    // Legacy mapping rules accept either an array of allowed values or one single value.
    if (Array.isArray(value)) {
      normalizedMapping[key] = value.map((item) => String(item));
      continue;
    }

    // A null entry means "no allowed value" for this controller key.
    if (value == null) {
      normalizedMapping[key] = [];
      continue;
    }

    // Normalize the single-value shorthand to the same array shape as the rest.
    normalizedMapping[key] = [String(value)];
  }

  return normalizedMapping;
}

function getColumnConstraint(
  column: DirectContributionTableColumn
): DirectContributionFieldConstraint | undefined {
  const rawConstraint = column.constraint;
  if (!rawConstraint || typeof rawConstraint !== 'object' || Array.isArray(rawConstraint)) {
    return undefined;
  }

  const rawType = typeof rawConstraint?.type === 'string'
    ? rawConstraint.type.trim().toLowerCase()
    : '';

  if (rawType.length === 0) {
    return undefined;
  }

  // Keep one normalized constraint shape so the runtime form logic does not need to know how the API originally represented the rule.
  return {
    type: rawType,
    regex: typeof rawConstraint.regex === 'string'
      ? rawConstraint.regex
      : undefined,
    mapping: getConstraintMapping(rawConstraint.mapping),
    value: typeof rawConstraint.value === 'string'
      ? rawConstraint.value
      : undefined,
  };
}

function getColumnJeuxAttributs(
  column: DirectContributionTableColumn
): Record<string, string | number | boolean | null> | undefined {
  const jeuxAttributs = column.jeuxAttributs;
  if (!jeuxAttributs || typeof jeuxAttributs !== 'object' || Array.isArray(jeuxAttributs)) {
    return undefined;
  }

  const normalizedConfig: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(jeuxAttributs)) {
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null
    ) {
      normalizedConfig[key] = value;
    }
  }

  return Object.keys(normalizedConfig).length > 0 ? normalizedConfig : undefined;
}

function getColumnNullable(column: DirectContributionTableColumn): boolean {
  if (typeof column.nullable === 'boolean') {
    return column.nullable;
  }
  if (typeof column.mandatory === 'boolean') {
    return !column.mandatory;
  }
  return true;
}
function getColumnRequired(column: DirectContributionTableColumn): boolean {
  return column.required === true || column.mandatory === true || column.nullable === false;
}
function getColumnDisabled(column: DirectContributionTableColumn): boolean {
  return (column.editable === false ||
    column.readOnly === true ||
    column.automatic === true ||
    column.computed === true);
}
function getColumnDefaultValue(column: DirectContributionTableColumn): unknown {
  return column.defaultValue ?? null;
}
function getColumnMin(column: DirectContributionTableColumn): number | string | undefined {
  return column.minValue;
}
function getColumnMax(column: DirectContributionTableColumn): number | string | undefined {
  return column.maxValue;
}
function getFieldKind(column: DirectContributionTableColumn, options: DirectContributionFieldOption[]): DirectContributionFieldKind {
  const type = getColumnType(column);
  const multiple = column.multiple === true;
  if (type === 'document') {
    return 'document';
  }
  if (type === 'like') {
    return 'like';
  }
  if (type === 'jsonvalue') {
    return 'json';
  }
  if (isBooleanLegacyType(type)) {
    return 'select';
  }
  if (type === 'list') {
    return multiple ? 'multiselect' : 'select';
  }
  if (options.length > 0 && LEGACY_SELECT_COMPATIBLE_TYPES.has(type)) {
    return multiple ? 'multiselect' : 'select';
  }
  if (type === 'date') {
    return 'date';
  }
  if (type === 'datetime') {
    return 'datetime';
  }
  if (type === 'yearmonth') {
    return 'month';
  }
  if (type === 'year') {
    return 'year';
  }
  if (type === 'integer' || type === 'int' || type === 'double' || type === 'number') {
    return 'number';
  }
  return 'text';
}

function toBooleanSelectValue(rawValue: unknown): string {
  if (typeof rawValue === 'boolean') {
    return String(rawValue);
  }
  if (typeof rawValue === 'string') {
    const normalizedValue = rawValue.trim().toLowerCase();
    if (BOOLEAN_TRUE_VALUES.includes(normalizedValue)) {
      return 'true';
    }
    if (BOOLEAN_FALSE_VALUES.includes(normalizedValue)) {
      return 'false';
    }
  }
  return '';
}

function toPlainRecord(value: unknown): Record<string, unknown> | null {
  const rawObject = toRawObject(value);
  if (!rawObject || Array.isArray(rawObject)) {
    return null;
  }

  return rawObject;
}

function toPlainRecordFromJson(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  try {
    return toPlainRecord(JSON.parse(value));
  } catch {
    return null;
  }
}

export function isDirectContributionDocumentValue(value: unknown): value is DirectContributionDocumentValue {
  return toPlainRecord(value)?.kind === 'document';
}

export function toDirectContributionDocumentValue(rawValue: unknown): DirectContributionDocumentValue {
  if (isDirectContributionDocumentValue(rawValue)) {
    return rawValue;
  }
  const documentId = rawValue == null || rawValue === '' ? null : String(rawValue);
  return {
    kind: 'document',
    documentId,
    file: null,
    removed: false,
  };
}
export function setDirectContributionDocumentFile(currentValue: unknown, file: File | null): DirectContributionDocumentValue {
  const currentDocumentValue = toDirectContributionDocumentValue(currentValue);
  return {
    ...currentDocumentValue,
    file,
    removed: false,
  };
}
export function clearDirectContributionDocumentValue(currentValue: unknown): DirectContributionDocumentValue {
  const currentDocumentValue = toDirectContributionDocumentValue(currentValue);
  return {
    ...currentDocumentValue,
    documentId: null,
    file: null,
    removed: true,
  };
}
export function isDirectContributionLikeValue(value: unknown): value is DirectContributionLikeValue {
  return toPlainRecord(value)?.kind === 'like';
}

export function toDirectContributionLikeValue(rawValue: unknown, userId?: number | null): DirectContributionLikeValue {
  if (isDirectContributionLikeValue(rawValue)) {
    return rawValue;
  }

  const parsedValue = toPlainRecord(rawValue) ?? toPlainRecordFromJson(rawValue);

  return {
    kind: 'like',
    cnt: typeof parsedValue?.cnt === 'number'
      ? parsedValue.cnt
      : Number(parsedValue?.cnt ?? 0) || 0,
    userid: typeof parsedValue?.userid === 'number'
      ? parsedValue.userid
      : userId ?? null,
    validDate: typeof parsedValue?.validDate === 'string' && parsedValue.validDate.length > 0
      ? parsedValue.validDate
      : null,
  };
}
export function incrementDirectContributionLikeValue(currentValue: unknown, userId?: number | null, now = new Date()): DirectContributionLikeValue {
  const likeValue = toDirectContributionLikeValue(currentValue, userId);
  const currentDate = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
  if (likeValue.userid === (userId ?? null) && likeValue.validDate === currentDate) {
    return likeValue;
  }
  return {
    kind: 'like',
    cnt: likeValue.cnt + 1,
    userid: userId ?? null,
    validDate: currentDate,
  };
}
function toJsonEditorValue(rawValue: unknown): string {
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return '';
  }
  if (typeof rawValue === 'string') {
    try {
      return JSON.stringify(JSON.parse(rawValue), null, 2);
    }
    catch {
      return rawValue;
    }
  }
  try {
    return JSON.stringify(rawValue, null, 2);
  }
  catch {
    return String(rawValue);
  }
}
function toDatetimeLocalInputValue(rawValue: unknown): string {
  if (typeof rawValue !== 'string' || rawValue.trim().length === 0) {
    return '';
  }
  const trimmedValue = rawValue.trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmedValue)) {
    return trimmedValue;
  }
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmedValue)) {
    return trimmedValue.replace(' ', 'T').slice(0, 16);
  }
  return trimmedValue;
}
function getInitialFieldValue(field: DirectContributionFieldDefinition, rawValue: unknown, userId?: number | null): DirectContributionFieldValue {
  if (field.kind === 'document') {
    return toDirectContributionDocumentValue(rawValue);
  }
  if (field.kind === 'like') {
    return toDirectContributionLikeValue(rawValue, userId);
  }
  if (field.kind === 'json') {
    return toJsonEditorValue(rawValue);
  }
  if (field.kind === 'multiselect') {
    return toStringArrayFieldValue(rawValue);
  }
  if (field.kind === 'select' && isBooleanLegacyType(field.legacyType)) {
    return toBooleanSelectValue(rawValue);
  }
  if (field.kind === 'datetime') {
    return toDatetimeLocalInputValue(rawValue);
  }
  return toStringFieldValue(rawValue);
}

/** Builds the UI field model from collaborative table metadata. */
export function getDirectContributionFieldDefinitions(table: Table): DirectContributionFieldDefinition[] {
  const fieldNames = Object.keys(table.columns).filter((columnName) => columnName !== table.geometryName && columnName !== table.idName);
  return fieldNames.map((columnName) => {
    const column = table.columns[columnName] as DirectContributionTableColumn;
    const options = getColumnOptions(column);
    const kind = getFieldKind(column, options);
    const legacyType = getColumnType(column);
    return {
      name: columnName,
      label: getColumnLabel(columnName, column),
      kind,
      legacyType,
      required: getColumnRequired(column),
      nullable: getColumnNullable(column),
      disabled: getColumnDisabled(column),
      defaultValue: getColumnDefaultValue(column),
      placeholder: column.placeholder,
      description: column.description,
      options: kind === 'select' || kind === 'multiselect'
        ? (options.length > 0
          ? options
          : isBooleanLegacyType(legacyType)
            ? [
              { value: 'true', label: 'Oui' },
              { value: 'false', label: 'Non' },
            ]
            : [])
        : undefined,
      multiple: kind === 'multiselect',
      accept: column.mimeTypes,
      min: getColumnMin(column),
      max: getColumnMax(column),
      step: kind === 'number'
        ? (isIntegerLegacyType(legacyType) ? 1 : 0.001)
        : kind === 'year'
          ? 1
          : undefined,
      minLength: column.minLength,
      maxLength: column.maxLength,
      pattern: column.pattern,
      jsonSchema: column.jsonSchema,
      conditionField: typeof column.conditionField === 'string'
        ? column.conditionField
        : undefined,
      constraint: getColumnConstraint(column),
      jeuxAttributs: getColumnJeuxAttributs(column),
    };
  });
}

/** Converts feature attributes and column defaults into control-friendly values. */
export function getDirectContributionInitialValues(table: Table, feature: Feature<Geometry>, fields: DirectContributionFieldDefinition[], userId?: number | null): Record<string, DirectContributionFieldValue> {
  const values: Record<string, DirectContributionFieldValue> = {};
  for (const field of fields) {
    const column = table.columns[field.name] as DirectContributionTableColumn | undefined;
    const rawValue = feature.get(field.name) ?? (column ? getColumnDefaultValue(column) : null);
    values[field.name] = getInitialFieldValue(field, rawValue, userId);
  }
  return values;
}

function getControllerFieldValue(value: DirectContributionFieldValue | undefined): string {
  if (Array.isArray(value)) {
    return value.join(',');
  }

  return toStringFieldValue(value);
}

function isRegexConstraintSatisfied(
  value: string,
  regex: string | undefined
): boolean {
  if (value.length === 0 || !regex) {
    return false;
  }

  try {
    return new RegExp(regex).test(value);
  } catch {
    return false;
  }
}

function getFilteredOptionsFromMappingConstraint(
  field: DirectContributionFieldDefinition,
  values: Record<string, DirectContributionFieldValue>
): DirectContributionFieldOption[] | null {
  if (
    field.constraint?.type !== 'mapping' ||
    !field.conditionField ||
    !field.options
  ) {
    return null;
  }

  const controllerValue = getControllerFieldValue(values[field.conditionField]);
  if (controllerValue.length === 0) {
    // No controller value means the dependent select should stay empty for now.
    return [];
  }

  const allowedValues = field.constraint.mapping?.[controllerValue];
  if (!allowedValues) {
    // Missing mapping entry falls back to the field's original option list.
    return null;
  }

  const allowedValueSet = new Set(allowedValues);
  return field.options.filter((option) => allowedValueSet.has(option.value));
}

function isFieldDependencyDisabled(
  field: DirectContributionFieldDefinition,
  values: Record<string, DirectContributionFieldValue>
): boolean {
  if (!field.conditionField || !field.constraint) {
    return false;
  }

  const controllerValue = getControllerFieldValue(values[field.conditionField]);

  switch (field.constraint.type) {
    // Mapping-based dependents are disabled until the controller has a value.
    case 'mapping':
      return controllerValue.length === 0;
    // Regex-based dependents are enabled only when the controller matches.
    case 'regex':
      return !isRegexConstraintSatisfied(controllerValue, field.constraint.regex);
    // Document-based dependents are filled automatically from the chosen file,
    // so they are not manually editable by the user.
    case 'document':
      return true;
    default:
      return false;
  }
}

function getResolvedSelectFallbackValue(
  field: DirectContributionFieldDefinition,
  allowedOptions: DirectContributionFieldOption[],
  userId?: number | null
): DirectContributionFieldValue {
  const defaultValue = getInitialFieldValue(
    field,
    field.defaultValue ?? null,
    userId
  );
  const allowedValueSet = new Set(allowedOptions.map((option) => option.value));

  if (field.kind === 'multiselect') {
    return toStringArrayFieldValue(defaultValue)
      .filter((value) => allowedValueSet.has(value));
  }

  const normalizedDefaultValue = toStringFieldValue(defaultValue);
  return allowedValueSet.has(normalizedDefaultValue) ? normalizedDefaultValue : '';
}

/**
 * Document fields can point to a server id, a local file draft, or a removed state.
 * Compare that richer shape so dependent fields are only recomputed on real changes.
 */
function areDocumentValuesEqual(
  left: DirectContributionDocumentValue,
  right: DirectContributionDocumentValue
): boolean {
  const leftFile = left.file;
  const rightFile = right.file;
  const leftFileSignature =
    leftFile instanceof File
      ? `${leftFile.name}:${leftFile.size}:${leftFile.type}:${leftFile.lastModified}`
      : leftFile
        ? `${leftFile.name}:${leftFile.mimeType ?? ''}:${leftFile.contentBase64.length}`
        : null;
  const rightFileSignature =
    rightFile instanceof File
      ? `${rightFile.name}:${rightFile.size}:${rightFile.type}:${rightFile.lastModified}`
      : rightFile
        ? `${rightFile.name}:${rightFile.mimeType ?? ''}:${rightFile.contentBase64.length}`
        : null;

  return (
    left.documentId === right.documentId &&
    left.removed === right.removed &&
    leftFileSignature === rightFileSignature
  );
}

function areLikeValuesEqual(
  left: DirectContributionLikeValue,
  right: DirectContributionLikeValue
): boolean {
  return (
    left.cnt === right.cnt &&
    left.userid === right.userid &&
    left.validDate === right.validDate
  );
}

function areFieldValuesEqual(
  left: DirectContributionFieldValue | undefined,
  right: DirectContributionFieldValue
): boolean {
  if (left === right) {
    return true;
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      left.every((value, index) => value === right[index])
    );
  }

  if (isDirectContributionDocumentValue(left) && isDirectContributionDocumentValue(right)) {
    return areDocumentValuesEqual(left, right);
  }

  if (isDirectContributionLikeValue(left) && isDirectContributionLikeValue(right)) {
    return areLikeValuesEqual(left, right);
  }

  return false;
}

function normalizeDocumentDependentDateValue(
  field: DirectContributionFieldDefinition,
  date: Date
): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  switch (field.kind) {
    case 'datetime':
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    case 'year':
      return String(year);
    case 'month':
      return `${year}-${month}`;
    default:
      return `${year}-${month}-${day}`;
  }
}

function getDocumentConstraintRawValue(
  field: DirectContributionFieldDefinition,
  documentValue: DirectContributionDocumentValue
): unknown {
  const documentFile = documentValue.file;

  if (!documentFile || !field.constraint?.value) {
    return null;
  }

  switch (field.constraint.value) {
    case 'nameFile()':
      return documentFile.name;
    case 'mimetypeFile()':
      return documentFile instanceof File
        ? documentFile.type
        : (documentFile.mimeType ?? '');
    case 'sizeFile()':
      return documentFile instanceof File ? documentFile.size : null;
    case 'dateFile()':
      return documentFile instanceof File
        ? normalizeDocumentDependentDateValue(
          field,
          new Date(documentFile.lastModified)
        )
        : null;
    default:
      return null;
  }
}

async function getDocumentConstraintRawValueAsync(
  field: DirectContributionFieldDefinition,
  documentValue: DirectContributionDocumentValue
): Promise<unknown> {
  const documentFile = documentValue.file;

  if (!documentFile || !field.constraint?.value) {
    return null;
  }

  if (field.constraint.value !== 'dateFile()' || !(documentFile instanceof File)) {
    return getDocumentConstraintRawValue(field, documentValue);
  }

  // Legacy tries to use the original capture date when it exists on a photo.
  // Fall back to the browser file timestamp when EXIF metadata is unavailable.
  const exifDate = await getExifOriginalDate(documentFile);
  const resolvedDate = exifDate ?? new Date(documentFile.lastModified);

  return normalizeDocumentDependentDateValue(field, resolvedDate);
}

/** Builds the runtime form state once current values are known. */
export function getDirectContributionResolvedFieldDefinitions(
  fields: DirectContributionFieldDefinition[],
  values: Record<string, DirectContributionFieldValue>
): DirectContributionResolvedFieldDefinition[] {
  return fields.map((field) => {
    const filteredOptions = getFilteredOptionsFromMappingConstraint(field, values);

    return {
      ...field,
      disabled: field.disabled || isFieldDependencyDisabled(field, values),
      options: filteredOptions ?? field.options,
    };
  });
}

function applyJeuxAttributsEffects(
  field: DirectContributionFieldDefinition,
  fieldsByName: Map<string, DirectContributionFieldDefinition>,
  values: Record<string, DirectContributionFieldValue>,
  userId: number | null | undefined,
  pendingFieldNames: string[]
): void {
  if (!field.jeuxAttributs) {
    return;
  }

  // jeux_attributs lets one field push preset values into other fields.
  for (const [targetFieldName, rawValue] of Object.entries(field.jeuxAttributs)) {
    const targetField = fieldsByName.get(targetFieldName);
    if (!targetField) {
      continue;
    }

    const nextValue = getInitialFieldValue(targetField, rawValue, userId);
    if (areFieldValuesEqual(values[targetFieldName], nextValue)) {
      continue;
    }

    values[targetFieldName] = nextValue;
    pendingFieldNames.push(targetFieldName);
  }
}

function applyDocumentDependentEffects(
  field: DirectContributionFieldDefinition,
  dependentFields: DirectContributionFieldDefinition[],
  values: Record<string, DirectContributionFieldValue>,
  userId: number | null | undefined,
  pendingFieldNames: string[]
): void {
  if (field.kind !== 'document') {
    return;
  }

  const documentValue = toDirectContributionDocumentValue(values[field.name]);

  // Document constraints derive metadata fields such as filename, mime type or date.
  for (const dependentField of dependentFields) {
    if (dependentField.constraint?.type !== 'document') {
      continue;
    }

    const rawValue = getDocumentConstraintRawValue(dependentField, documentValue);
    const nextValue = getInitialFieldValue(dependentField, rawValue, userId);

    if (areFieldValuesEqual(values[dependentField.name], nextValue)) {
      continue;
    }

    values[dependentField.name] = nextValue;
    pendingFieldNames.push(dependentField.name);
  }
}

function sanitizeDependentFieldValue(
  field: DirectContributionFieldDefinition,
  values: Record<string, DirectContributionFieldValue>,
  userId: number | null | undefined
): DirectContributionFieldValue | null {
  if (!field.conditionField || !field.constraint) {
    return null;
  }

  if (field.constraint.type === 'document') {
    return null;
  }

  const dependencyDisabled = isFieldDependencyDisabled(field, values);
  if (dependencyDisabled) {
    return getInitialFieldValue(field, field.defaultValue ?? null, userId);
  }

  const filteredOptions = getFilteredOptionsFromMappingConstraint(field, values);
  if (!filteredOptions) {
    return null;
  }

  // If a mapping rule removes the current value from the allowed list, reset the field to a safe value instead of keeping an invalid selection around.
  if (field.kind === 'multiselect') {
    const allowedValueSet = new Set(filteredOptions.map((option) => option.value));
    const currentValues = toStringArrayFieldValue(values[field.name]);
    const nextValues = currentValues.filter((value) => allowedValueSet.has(value));

    return nextValues.length === currentValues.length
      ? null
      : nextValues;
  }

  const currentValue = toStringFieldValue(values[field.name]);
  if (currentValue.length === 0) {
    return null;
  }

  const allowedValueSet = new Set(filteredOptions.map((option) => option.value));
  if (allowedValueSet.has(currentValue)) {
    return null;
  }

  return getResolvedSelectFallbackValue(field, filteredOptions, userId);
}

/**
 * Replays the legacy field side effects after a value changes:
 * - conditionField tells us which field is the controller
 * - constraint tells us how to react to that controller value
 * - jeux_attributs lets the changed field push preset values into other fields
 */
export function applyDirectContributionFieldEffects(
  fields: DirectContributionFieldDefinition[],
  values: Record<string, DirectContributionFieldValue>,
  changedFieldName: string,
  userId?: number | null
): Record<string, DirectContributionFieldValue> {
  const fieldsByName = new Map(fields.map((field) => [field.name, field]));
  const nextValues = { ...values };
  const pendingFieldNames = [changedFieldName];

  while (pendingFieldNames.length > 0) {
    const controllerFieldName = pendingFieldNames.shift();
    if (!controllerFieldName) {
      continue;
    }

    const controllerField = fieldsByName.get(controllerFieldName);
    if (!controllerField) {
      continue;
    }

    const dependentFields = fields.filter(
      (field) => field.conditionField === controllerFieldName
    );

    applyJeuxAttributsEffects(
      controllerField,
      fieldsByName,
      nextValues,
      userId,
      pendingFieldNames
    );
    applyDocumentDependentEffects(
      controllerField,
      dependentFields,
      nextValues,
      userId,
      pendingFieldNames
    );

    for (const dependentField of dependentFields) {
      const sanitizedValue = sanitizeDependentFieldValue(
        dependentField,
        nextValues,
        userId
      );

      if (
        sanitizedValue === null ||
        areFieldValuesEqual(nextValues[dependentField.name], sanitizedValue)
      ) {
        continue;
      }

      nextValues[dependentField.name] = sanitizedValue;
      pendingFieldNames.push(dependentField.name);
    }
  }

  return nextValues;
}

export async function applyDirectContributionAsyncFieldEffects(
  fields: DirectContributionFieldDefinition[],
  values: Record<string, DirectContributionFieldValue>,
  changedFieldName: string,
  userId?: number | null
): Promise<Record<string, DirectContributionFieldValue>> {
  const changedField = fields.find((field) => field.name === changedFieldName);
  if (!changedField || changedField.kind !== 'document') {
    return values;
  }

  const dependentFields = fields.filter(
    (field) =>
      field.conditionField === changedFieldName &&
      field.constraint?.type === 'document'
  );
  if (dependentFields.length === 0) {
    return values;
  }

  const nextValues = { ...values };
  const documentValue = toDirectContributionDocumentValue(nextValues[changedFieldName]);

  for (const dependentField of dependentFields) {
    const rawValue = await getDocumentConstraintRawValueAsync(
      dependentField,
      documentValue
    );
    const nextValue = getInitialFieldValue(dependentField, rawValue, userId);

    if (areFieldValuesEqual(nextValues[dependentField.name], nextValue)) {
      continue;
    }

    nextValues[dependentField.name] = nextValue;
  }

  return nextValues;
}

function getMandatoryError(t: TranslationFn): string {
  return t('layers.directContribution.form.validation.mandatory');
}

function getEmptyValueResult(field: DirectContributionFieldDefinition, t: TranslationFn): DirectContributionFieldValidationResult {
  return {
    normalizedValue: null,
    error: field.required ? getMandatoryError(t) : undefined,
  };
}

function validateTextValue(field: DirectContributionFieldDefinition, rawValue: DirectContributionFieldValue, context: DirectContributionFieldValidationContext): DirectContributionFieldValidationResult {
  const value = typeof rawValue === 'string' ? rawValue.trim() : '';
  if (value.length === 0) {
    return getEmptyValueResult(field, context.t);
  }
  if (field.maxLength !== undefined && value.length > field.maxLength) {
    return {
      normalizedValue: value,
      error: context.t('layers.directContribution.form.validation.maxLength', {
        value: field.maxLength,
      }),
    };
  }
  if (field.minLength !== undefined && value.length < field.minLength) {
    return {
      normalizedValue: value,
      error: context.t('layers.directContribution.form.validation.minLength', {
        value: field.minLength,
      }),
    };
  }
  if (field.pattern === '_URL_') {
    try {
      new URL(value);
    }
    catch {
      return {
        normalizedValue: value,
        error: context.t('layers.directContribution.form.validation.invalidUrl'),
      };
    }
  }
  else if (field.pattern) {
    const regex = new RegExp(field.pattern);
    if (!regex.test(value)) {
      return {
        normalizedValue: value,
        error: context.t('layers.directContribution.form.validation.invalidRegex', {
          value: field.pattern,
        }),
      };
    }
  }
  return {
    normalizedValue: value,
  };
}
function validateIntegerValue(field: DirectContributionFieldDefinition, rawValue: DirectContributionFieldValue, context: DirectContributionFieldValidationContext): DirectContributionFieldValidationResult {
  const value = typeof rawValue === 'string' ? rawValue.trim() : '';
  if (value.length === 0) {
    return getEmptyValueResult(field, context.t);
  }
  if (!/^[+-]?\d+$/.test(value)) {
    return {
      normalizedValue: value,
      error: context.t('layers.directContribution.form.validation.invalidNumber'),
    };
  }
  const parsedValue = Number.parseInt(value, 10);
  if (field.max !== undefined && parsedValue > Number(field.max)) {
    return {
      normalizedValue: parsedValue,
      error: context.t('layers.directContribution.form.validation.max', {
        value: field.max,
      }),
    };
  }
  if (field.min !== undefined && parsedValue < Number(field.min)) {
    return {
      normalizedValue: parsedValue,
      error: context.t('layers.directContribution.form.validation.min', {
        value: field.min,
      }),
    };
  }
  return {
    normalizedValue: parsedValue,
  };
}
function validateDoubleValue(field: DirectContributionFieldDefinition, rawValue: DirectContributionFieldValue, context: DirectContributionFieldValidationContext): DirectContributionFieldValidationResult {
  const value = typeof rawValue === 'string' ? rawValue.trim() : '';
  if (value.length === 0) {
    return getEmptyValueResult(field, context.t);
  }
  const normalizedValue = value.replace(',', '.');
  const parsedValue = Number(normalizedValue);
  if (!Number.isFinite(parsedValue)) {
    return {
      normalizedValue: value,
      error: context.t('layers.directContribution.form.validation.invalidDouble'),
    };
  }
  if (field.max !== undefined && parsedValue > Number(field.max)) {
    return {
      normalizedValue: parsedValue,
      error: context.t('layers.directContribution.form.validation.max', {
        value: field.max,
      }),
    };
  }
  if (field.min !== undefined && parsedValue < Number(field.min)) {
    return {
      normalizedValue: parsedValue,
      error: context.t('layers.directContribution.form.validation.min', {
        value: field.min,
      }),
    };
  }
  return {
    normalizedValue: parsedValue,
  };
}
function isValidDateValue(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day);
}
function isValidYearMonthValue(value: string): boolean {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }
  const month = Number(match[2]);
  return month >= 1 && month <= 12;
}
function isValidYearValue(value: string): boolean {
  return /^\d{4}$/.test(value);
}
function isValidDateTimeValue(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  if (hour > 23 || minute > 59 || second > 59) {
    return false;
  }
  return isValidDateValue(`${match[1]}-${match[2]}-${match[3]}`);
}
function compareIsoLikeValues(value: string, boundary: number | string, direction: 'min' | 'max'): boolean {
  const normalizedBoundary = String(boundary);
  return direction === 'min'
    ? value >= normalizedBoundary
    : value <= normalizedBoundary;
}
function validateDateLikeValue(field: DirectContributionFieldDefinition, rawValue: DirectContributionFieldValue, context: DirectContributionFieldValidationContext): DirectContributionFieldValidationResult {
  const rawStringValue = typeof rawValue === 'string' ? rawValue.trim() : '';
  if (rawStringValue.length === 0) {
    return getEmptyValueResult(field, context.t);
  }
  let normalizedValue = rawStringValue;
  let isValid = false;
  switch (field.kind) {
    case 'date':
      isValid = isValidDateValue(normalizedValue);
      break;
    case 'month':
      isValid = isValidYearMonthValue(normalizedValue);
      break;
    case 'year':
      isValid = isValidYearValue(normalizedValue);
      break;
    case 'datetime':
      normalizedValue = rawStringValue.includes('T')
        ? `${rawStringValue.replace('T', ' ')}:00`
        : rawStringValue;
      isValid = isValidDateTimeValue(normalizedValue);
      break;
    default:
      isValid = false;
  }
  if (!isValid) {
    return {
      normalizedValue,
      error: context.t('layers.directContribution.form.validation.invalidDate'),
    };
  }
  if (field.min !== undefined && !compareIsoLikeValues(normalizedValue, field.min, 'min')) {
    return {
      normalizedValue,
      error: context.t('layers.directContribution.form.validation.min', {
        value: field.min,
      }),
    };
  }
  if (field.max !== undefined && !compareIsoLikeValues(normalizedValue, field.max, 'max')) {
    return {
      normalizedValue,
      error: context.t('layers.directContribution.form.validation.max', {
        value: field.max,
      }),
    };
  }
  return {
    normalizedValue,
  };
}
function validateSelectValue(field: DirectContributionFieldDefinition, rawValue: DirectContributionFieldValue, context: DirectContributionFieldValidationContext): DirectContributionFieldValidationResult {
  const value = typeof rawValue === 'string' ? rawValue : '';
  if (isBooleanLegacyType(field.legacyType)) {
    const normalizedBooleanValue = value.trim();
    if (normalizedBooleanValue.length === 0) {
      return getEmptyValueResult(field, context.t);
    }
    return {
      normalizedValue: normalizedBooleanValue === 'true',
    };
  }
  if (value.length === 0) {
    return getEmptyValueResult(field, context.t);
  }
  return {
    normalizedValue: value,
  };
}
function validateMultiselectValue(field: DirectContributionFieldDefinition, rawValue: DirectContributionFieldValue, context: DirectContributionFieldValidationContext): DirectContributionFieldValidationResult {
  if (!Array.isArray(rawValue)) {
    return {
      normalizedValue: rawValue,
      error: context.t('layers.directContribution.form.validation.unexpectedType'),
    };
  }
  const normalizedValues = rawValue
    .map((value) => String(value))
    .filter((value) => value.length > 0);
  if (normalizedValues.length === 0) {
    return getEmptyValueResult(field, context.t);
  }
  return {
    normalizedValue: normalizedValues,
  };
}
function validateDocumentValue(field: DirectContributionFieldDefinition, rawValue: DirectContributionFieldValue, context: DirectContributionFieldValidationContext): DirectContributionFieldValidationResult {
  const value = toDirectContributionDocumentValue(rawValue);
  const hasValue = (!value.removed && value.file !== null) || (!value.removed && value.documentId !== null);
  if (!hasValue) {
    return {
      ...getEmptyValueResult(field, context.t),
      normalizedValue: value,
    };
  }
  return {
    normalizedValue: value,
  };
}
function validateLikeValue(field: DirectContributionFieldDefinition, rawValue: DirectContributionFieldValue, context: DirectContributionFieldValidationContext): DirectContributionFieldValidationResult {
  const value = toDirectContributionLikeValue(rawValue);
  if (value.cnt <= 0) {
    return getEmptyValueResult(field, context.t);
  }
  return {
    normalizedValue: {
      cnt: value.cnt,
      userid: value.userid,
      validDate: value.validDate,
    },
  };
}
function validateJsonValue(field: DirectContributionFieldDefinition, rawValue: DirectContributionFieldValue, context: DirectContributionFieldValidationContext): DirectContributionFieldValidationResult {
  const value = typeof rawValue === 'string' ? rawValue.trim() : '';
  if (value.length === 0) {
    return getEmptyValueResult(field, context.t);
  }
  try {
    const parsedValue = JSON.parse(value);
    const rootType = field.jsonSchema?.type;
    if (rootType === 'object' && !toPlainRecord(parsedValue)) {
      return {
        normalizedValue: parsedValue,
        error: context.t('layers.directContribution.form.validation.unexpectedType'),
      };
    }
    if (rootType === 'array' && !Array.isArray(parsedValue)) {
      return {
        normalizedValue: parsedValue,
        error: context.t('layers.directContribution.form.validation.unexpectedType'),
      };
    }
    return {
      normalizedValue: parsedValue,
    };
  }
  catch {
    return {
      normalizedValue: value,
      error: context.t('layers.directContribution.form.validation.invalidJson'),
    };
  }
}

/** Normalizes UI values back to feature attributes and returns validation errors. */
export function validateAndNormalizeDirectContributionFieldValue(field: DirectContributionFieldDefinition, rawValue: DirectContributionFieldValue, context: DirectContributionFieldValidationContext): DirectContributionFieldValidationResult {
  switch (field.kind) {
    case 'text':
      return validateTextValue(field, rawValue, context);
    case 'number':
      return isIntegerLegacyType(field.legacyType)
        ? validateIntegerValue(field, rawValue, context)
        : validateDoubleValue(field, rawValue, context);
    case 'date':
    case 'datetime':
    case 'month':
    case 'year':
      return validateDateLikeValue(field, rawValue, context);
    case 'select':
      return validateSelectValue(field, rawValue, context);
    case 'multiselect':
      return validateMultiselectValue(field, rawValue, context);
    case 'document':
      return validateDocumentValue(field, rawValue, context);
    case 'like':
      return validateLikeValue(field, rawValue, context);
    case 'json':
      return validateJsonValue(field, rawValue, context);
    default:
      return {
        normalizedValue: rawValue,
      };
  }
}
