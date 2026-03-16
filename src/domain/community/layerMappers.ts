import type {
	CommunityLayer,
	Geoservice,
	Table,
	TableColumn,
} from '@ign/mobile-core';
import {
	toBoolean,
	toNumber,
	toRawObject,
	toStringValue,
} from '@/shared/utils/coercion';

type TableColumnSelectValues = string[] | Record<string, string | number | boolean | null>;

// Normalize table-level API aliases once so the rest of the app only sees the
// camelCase contract we use in refonte.
function getNormalizedTableBase(raw: Record<string, unknown>): Record<string, unknown> {
	const normalizedRaw = { ...raw };

	delete normalizedRaw.id_name;
	delete normalizedRaw.database_id;
	delete normalizedRaw.database_name;
	delete normalizedRaw.table_name;
	delete normalizedRaw.geometry_name;
	delete normalizedRaw.min_zoom_level;
	delete normalizedRaw.max_zoom_level;
	delete normalizedRaw.read_only;
	delete normalizedRaw.doc_uri;
	delete normalizedRaw.wfs_url;
	delete normalizedRaw.tile_zoom_level;

	return normalizedRaw;
}

// Columns can still come from the backend with a mix of raw legacy aliases.
// Strip those aliases here before we write the canonical camelCase properties.
function getNormalizedTableColumnBase(raw: Record<string, unknown>): Record<string, unknown> {
	const normalizedRaw = { ...raw };

	delete normalizedRaw.default;
	delete normalizedRaw.default_value;
	delete normalizedRaw.read_only;
	delete normalizedRaw.list_of_values;
	delete normalizedRaw.values;
	delete normalizedRaw.enum;
	delete normalizedRaw.min_length;
	delete normalizedRaw.max_length;
	delete normalizedRaw.min_value;
	delete normalizedRaw.max_value;
	delete normalizedRaw.custom_id;
	delete normalizedRaw.mime_types;
	delete normalizedRaw.json_schema;

	return normalizedRaw;
}

// Legacy collaborative tables expose select/list choices under several field
// names. Direct contribution forms only need one normalized "available values"
// source, so we merge them here.
function getColumnSelectValues(raw: Record<string, unknown>): TableColumnSelectValues | undefined {
	const candidate = raw.selectValues ?? raw.enum ?? raw.listOfValues ?? raw.list_of_values ?? raw.values;

	if (Array.isArray(candidate)) {
		return candidate.map((value) => {
			if (
				typeof value === 'string' ||
				typeof value === 'number' ||
				typeof value === 'boolean' ||
				value === null
			) {
				return value;
			}

			return String(value);
		});
	}

	const candidateRecord = toRawObject(candidate);
	if (!candidateRecord) {
		return undefined;
	}

	const normalizedValues: Record<string, string | number | boolean | null> = {};
	for (const [key, value] of Object.entries(candidateRecord)) {
		if (
			typeof value === 'string' ||
			typeof value === 'number' ||
			typeof value === 'boolean' ||
			value === null
		) {
			normalizedValues[key] = value;
			continue;
		}

		normalizedValues[key] = String(value);
	}

	return normalizedValues;
}

// Column min/max boundaries are later used by the direct contribution form to
// Depending on the field type, it can be a number or a string.
function getColumnBoundary(value: unknown): number | string | undefined {
	return toNumber(value) ?? toStringValue(value);
}

// Build one normalized column definition for all feature code that consumes
// table metadata, including the direct contribution attribute form.
function mapTableColumn(rawColumn: Record<string, unknown>): TableColumn {
	const name = toStringValue(rawColumn.name);
	if (!name) {
		throw new Error('Cannot map table column without a name');
	}

	const rawType = toStringValue(rawColumn.type) ?? 'string';
	const column: TableColumn = {
		...(getNormalizedTableColumnBase(rawColumn) as unknown as TableColumn),
		name,
		type: rawType as unknown as TableColumn['type'],
	};

	const title = toStringValue(rawColumn.title);
	if (title !== undefined) column.title = title;

	const required = toBoolean(rawColumn.required);
	if (required !== undefined) column.required = required;

	const editable = toBoolean(rawColumn.editable);
	if (editable !== undefined) column.editable = editable;

	const searchable = toBoolean(rawColumn.searchable);
	if (searchable !== undefined) column.searchable = searchable;

	const crs = toStringValue(rawColumn.crs);
	if (crs !== undefined) column.crs = crs;

	column.defaultValue =
		rawColumn.defaultValue ??
		rawColumn.default_value ??
		rawColumn.default ??
		column.defaultValue;

	const readOnly = toBoolean(rawColumn.readOnly ?? rawColumn.read_only);
	if (readOnly !== undefined) {
		(column as TableColumn & { readOnly?: boolean }).readOnly = readOnly;
	}

	const selectValues = getColumnSelectValues(rawColumn);
	if (selectValues !== undefined) {
		(column as TableColumn & { selectValues?: TableColumnSelectValues }).selectValues = selectValues;
	}

	const placeholder = toStringValue(rawColumn.placeholder);
	if (placeholder !== undefined) {
		(column as TableColumn & { placeholder?: string }).placeholder = placeholder;
	}

	const nullable = toBoolean(rawColumn.nullable);
	if (nullable !== undefined) {
		(column as TableColumn & { nullable?: boolean }).nullable = nullable;
	}

	const mandatory = toBoolean(rawColumn.mandatory);
	if (mandatory !== undefined) {
		(column as TableColumn & { mandatory?: boolean }).mandatory = mandatory;
	}

	const description = toStringValue(rawColumn.description);
	if (description !== undefined) {
		(column as TableColumn & { description?: string }).description = description;
	}

	const automatic = toBoolean(rawColumn.automatic);
	if (automatic !== undefined) {
		(column as TableColumn & { automatic?: boolean }).automatic = automatic;
	}

	const computed = toBoolean(rawColumn.computed);
	if (computed !== undefined) {
		(column as TableColumn & { computed?: boolean }).computed = computed;
	}

	const minLength = toNumber(rawColumn.minLength ?? rawColumn.min_length);
	if (minLength !== undefined) {
		(column as TableColumn & { minLength?: number }).minLength = minLength;
	}

	const maxLength = toNumber(rawColumn.maxLength ?? rawColumn.max_length);
	if (maxLength !== undefined) {
		(column as TableColumn & { maxLength?: number }).maxLength = maxLength;
	}

	const minValue = getColumnBoundary(rawColumn.minValue ?? rawColumn.min_value);
	if (minValue !== undefined) {
		(column as TableColumn & { minValue?: number | string }).minValue = minValue;
	}

	const maxValue = getColumnBoundary(rawColumn.maxValue ?? rawColumn.max_value);
	if (maxValue !== undefined) {
		(column as TableColumn & { maxValue?: number | string }).maxValue = maxValue;
	}

	const pattern = toStringValue(rawColumn.pattern);
	if (pattern !== undefined) {
		(column as TableColumn & { pattern?: string }).pattern = pattern;
	}

	const customId = toBoolean(rawColumn.customId ?? rawColumn.custom_id);
	if (customId !== undefined) {
		(column as TableColumn & { customId?: boolean }).customId = customId;
	}

	const multiple = toBoolean(rawColumn.multiple);
	if (multiple !== undefined) {
		(column as TableColumn & { multiple?: boolean }).multiple = multiple;
	}

	const mimeTypes = toStringValue(rawColumn.mimeTypes ?? rawColumn.mime_types);
	if (mimeTypes !== undefined) {
		(column as TableColumn & { mimeTypes?: string }).mimeTypes = mimeTypes;
	}

	const jsonSchema = toRawObject(rawColumn.jsonSchema ?? rawColumn.json_schema);
	if (jsonSchema) {
		(column as TableColumn & { jsonSchema?: Record<string, unknown> }).jsonSchema = jsonSchema;
	}

	return column;
}

function mapTableColumns(columns: unknown): Record<string, TableColumn> {
	const columnsRecord: Record<string, TableColumn> = {};
	const rawColumns = toRawObject(columns);

	if (!rawColumns && !Array.isArray(columns)) {
		return columnsRecord;
	}

	const values = Array.isArray(columns) ? columns : Object.values(rawColumns!);
	for (const rawValue of values) {
		const rawColumn = toRawObject(rawValue);
		if (!rawColumn) continue;
		const name = toStringValue(rawColumn.name);
		if (!name) continue;

		columnsRecord[name] = mapTableColumn(rawColumn);
	}

	return columnsRecord;
}

export function mapApiGeoservice(apiGeoservice: unknown): Geoservice {
	const raw = toRawObject(apiGeoservice) ?? {};
	const mapped: Geoservice = {
		...(raw as unknown as Geoservice),
		id: toNumber(raw.id) ?? 0,
		title: toStringValue(raw.title) ?? '',
		url: toStringValue(raw.url) ?? '',
		type: (toStringValue(raw.type) ?? 'WFS') as unknown as Geoservice['type'],
		layers: toStringValue(raw.layers) ?? '',
	};

	const description = toStringValue(raw.description);
	if (description !== undefined) mapped.description = description;

	const version = toStringValue(raw.version);
	if (version !== undefined) mapped.version = version;

	const format = toStringValue(raw.format);
	if (format !== undefined) mapped.format = format;

	const authentication = toBoolean(raw.authentication);
	if (authentication !== undefined) mapped.authentication = authentication;

	const minZoom = toNumber(raw.minZoom ?? raw.min_zoom);
	if (minZoom !== undefined) mapped.minZoom = minZoom;

	const maxZoom = toNumber(raw.maxZoom ?? raw.max_zoom);
	if (maxZoom !== undefined) mapped.maxZoom = maxZoom;

	const inputMask = raw.input_mask ?? raw.inputMask;
	if (inputMask && typeof inputMask === 'object') {
		mapped.input_mask = inputMask as Geoservice['input_mask'];
	}

	return mapped;
}

export function mapApiTable(apiTable: unknown): Table {
	const raw = toRawObject(apiTable) ?? {};
	const databaseId = toNumber(raw.databaseId ?? raw.database_id ?? raw.database);
	const databaseName = toStringValue(raw.database ?? raw.database_name ?? raw.dbname);

	const mapped: Table = {
		...(getNormalizedTableBase(raw) as unknown as Table),
		id: toNumber(raw.id) ?? 0,
		database: databaseName ?? (databaseId !== undefined ? String(databaseId) : ''),
		databaseId: databaseId ?? 0,
		idName: toStringValue(raw.idName ?? raw.id_name) ?? 'id',
		name: toStringValue(raw.name ?? raw.table_name) ?? '',
		title: toStringValue(raw.title ?? raw.name ?? raw.table_name) ?? '',
		wfs: toStringValue(raw.wfs ?? raw.wfs_url) ?? '',
		geometryName: toStringValue(raw.geometryName ?? raw.geometry_name) ?? 'geometrie',
		columns: mapTableColumns(raw.columns),
	};

	const description = toStringValue(raw.description);
	if (description !== undefined) mapped.description = description;

	const projection = toStringValue(raw.projection);
	if (projection !== undefined) mapped.projection = projection;

	const minZoomLevel = toNumber(raw.minZoomLevel ?? raw.min_zoom_level);
	if (minZoomLevel !== undefined) mapped.minZoomLevel = minZoomLevel;

	const maxZoomLevel = toNumber(raw.maxZoomLevel ?? raw.max_zoom_level);
	if (maxZoomLevel !== undefined) mapped.maxZoomLevel = maxZoomLevel;

	const searchable = toBoolean(raw.searchable);
	if (searchable !== undefined) mapped.searchable = searchable;

	const editable = toBoolean(raw.editable);
	if (editable !== undefined) mapped.editable = editable;

	const readOnly = toBoolean(raw.readOnly ?? raw.read_only);
	if (readOnly !== undefined) mapped.readOnly = readOnly;

	const docURI = toStringValue(raw.docURI ?? raw.doc_uri);
	if (docURI !== undefined) mapped.docURI = docURI;

	if ('style' in raw) {
		mapped.style = raw.style as Table['style'];
	}

	if ('styles' in raw && Array.isArray(raw.styles)) {
		mapped.styles = raw.styles as Table['styles'];
	}

	const tileZoomLevel = toNumber(raw.tileZoomLevel ?? raw.tile_zoom_level);
	if (tileZoomLevel !== undefined) {
		mapped.tileZoomLevel = tileZoomLevel;
	}

	return mapped;
}

export function mapApiLayerToCommunityLayer(apiLayer: unknown): CommunityLayer {
	const raw = toRawObject(apiLayer) ?? {};
	const mapped: CommunityLayer = {
		...(raw as unknown as CommunityLayer),
		id: toNumber(raw.id) ?? 0,
		title: toStringValue(raw.title) ?? '',
	};

	const visible = toBoolean(raw.visible ?? raw.visibility);
	if (visible !== undefined) {
		mapped.visible = visible;
	}

	const opacity = toNumber(raw.opacity);
	if (opacity !== undefined) {
		mapped.opacity = opacity;
	}

	const database = toNumber(raw.database ?? raw.database_id);
	if (database !== undefined) {
		mapped.database = database;
	}

	const geoservice = raw.geoservice;
	if (geoservice && typeof geoservice === 'object') {
		mapped.geoservice = mapApiGeoservice(geoservice);
	} else {
		const geoserviceId = toNumber(geoservice ?? raw.geoservice_id);
		if (geoserviceId !== undefined) {
			mapped.geoservice = { id: geoserviceId } as Geoservice;
		}
	}

	const table = raw.table;
	if (table && typeof table === 'object') {
		mapped.table = mapApiTable(table);
	} else {
		const tableId = toNumber(table ?? raw.table_id);
		if (tableId !== undefined) {
			mapped.table = tableId as unknown as Table;
		}
	}

	const rawExtent = raw.extent;
	if (Array.isArray(rawExtent)) {
		mapped.extent = rawExtent.map((value) => String(value));
	} else if (typeof rawExtent === 'string') {
		mapped.extent = rawExtent.split(',');
	}

	return mapped;
}
