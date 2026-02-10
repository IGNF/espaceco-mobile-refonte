import type { Geoservice, Table, TableColumn } from '@ign/mobile-core'
import type { EnrichedCommunityLayer } from './models'
import {
	toBoolean,
	toNumber,
	toRawObject,
	toStringValue,
} from '@/shared/utils/coercion'

function mapTableColumns(columns: unknown): Record<string, TableColumn> {
	const columnsRecord: Record<string, TableColumn> = {}
	const rawColumns = toRawObject(columns)

	if (!rawColumns && !Array.isArray(columns)) {
		return columnsRecord
	}

	const values = Array.isArray(columns) ? columns : Object.values(rawColumns!)
	for (const rawValue of values) {
		const rawColumn = toRawObject(rawValue)
		if (!rawColumn) continue

		const name = toStringValue(rawColumn.name)
		if (!name) continue

		const rawType = toStringValue(rawColumn.type) ?? 'string'
		const type = rawType as TableColumn['type']

		const column: TableColumn = {
			...(rawColumn as unknown as TableColumn),
			name,
			type,
		}

		if ('default_value' in rawColumn && !('defaultValue' in column)) {
			column.defaultValue = rawColumn.default_value
		}

		columnsRecord[name] = column
	}

	return columnsRecord
}

export function mapApiGeoservice(apiGeoservice: unknown): Geoservice {
	const raw = toRawObject(apiGeoservice) ?? {}
	const mapped: Geoservice = {
		...(raw as unknown as Geoservice),
		id: toNumber(raw.id) ?? 0,
		title: toStringValue(raw.title) ?? '',
		url: toStringValue(raw.url) ?? '',
		type: (toStringValue(raw.type) ?? 'WFS') as unknown as Geoservice['type'],
		layers: toStringValue(raw.layers) ?? '',
	}

	const description = toStringValue(raw.description)
	if (description !== undefined) mapped.description = description

	const version = toStringValue(raw.version)
	if (version !== undefined) mapped.version = version

	const format = toStringValue(raw.format)
	if (format !== undefined) mapped.format = format

	const authentication = toBoolean(raw.authentication)
	if (authentication !== undefined) mapped.authentication = authentication

	const minZoom = toNumber(raw.minZoom ?? raw.min_zoom)
	if (minZoom !== undefined) mapped.minZoom = minZoom

	const maxZoom = toNumber(raw.maxZoom ?? raw.max_zoom)
	if (maxZoom !== undefined) mapped.maxZoom = maxZoom

	const inputMask = raw.input_mask ?? raw.inputMask
	if (inputMask && typeof inputMask === 'object') {
		mapped.input_mask = inputMask as Geoservice['input_mask']
	}

	return mapped
}

export function mapApiTable(apiTable: unknown): Table {
	const raw = toRawObject(apiTable) ?? {}
	const databaseId = toNumber(raw.databaseId ?? raw.database_id ?? raw.database)
	const databaseName = toStringValue(raw.database ?? raw.database_name ?? raw.dbname)

	const mapped: Table = {
		...(raw as unknown as Table),
		id: toNumber(raw.id) ?? 0,
		database: databaseName ?? (databaseId !== undefined ? String(databaseId) : ''),
		databaseId: databaseId ?? 0,
		name: toStringValue(raw.name ?? raw.table_name) ?? '',
		title: toStringValue(raw.title ?? raw.name ?? raw.table_name) ?? '',
		wfs: toStringValue(raw.wfs ?? raw.wfs_url) ?? '',
		geometryName: toStringValue(raw.geometryName ?? raw.geometry_name) ?? 'geometrie',
		columns: mapTableColumns(raw.columns),
	}

	const description = toStringValue(raw.description)
	if (description !== undefined) mapped.description = description

	const projection = toStringValue(raw.projection)
	if (projection !== undefined) mapped.projection = projection

	const minZoomLevel = toNumber(raw.minZoomLevel ?? raw.min_zoom_level)
	if (minZoomLevel !== undefined) mapped.minZoomLevel = minZoomLevel

	const maxZoomLevel = toNumber(raw.maxZoomLevel ?? raw.max_zoom_level)
	if (maxZoomLevel !== undefined) mapped.maxZoomLevel = maxZoomLevel

	const searchable = toBoolean(raw.searchable)
	if (searchable !== undefined) mapped.searchable = searchable

	const editable = toBoolean(raw.editable)
	if (editable !== undefined) mapped.editable = editable

	const docURI = toStringValue(raw.docURI ?? raw.doc_uri)
	if (docURI !== undefined) mapped.docURI = docURI

	if ('style' in raw) {
		mapped.style = raw.style as Table['style']
	}

	if ('styles' in raw && Array.isArray(raw.styles)) {
		mapped.styles = raw.styles as Table['styles']
	}

	const tileZoomLevel = toNumber(raw.tileZoomLevel ?? raw.tile_zoom_level)
	if (tileZoomLevel !== undefined) {
		;(mapped as Table & { tileZoomLevel?: number }).tileZoomLevel = tileZoomLevel
	}

	return mapped
}

export function mapApiLayerToEnrichedCommunityLayer(apiLayer: unknown): EnrichedCommunityLayer {
	const raw = toRawObject(apiLayer) ?? {}
	const mapped: EnrichedCommunityLayer = {
		...(raw as unknown as EnrichedCommunityLayer),
		id: toNumber(raw.id) ?? 0,
		title: toStringValue(raw.title) ?? '',
	}

	const visible = toBoolean(raw.visible ?? raw.visibility)
	if (visible !== undefined) {
		mapped.visible = visible
	}

	const opacity = toNumber(raw.opacity)
	if (opacity !== undefined) {
		mapped.opacity = opacity
	}

	const database = toNumber(raw.database ?? raw.database_id)
	if (database !== undefined) {
		mapped.database = database
	}

	const geoservice = raw.geoservice
	if (geoservice && typeof geoservice === 'object') {
		mapped.geoservice = mapApiGeoservice(geoservice)
	} else {
		const geoserviceId = toNumber(geoservice ?? raw.geoservice_id)
		if (geoserviceId !== undefined) {
			mapped.geoservice = { id: geoserviceId } as Geoservice
		}
	}

	const table = raw.table
	if (table && typeof table === 'object') {
		mapped.table = mapApiTable(table)
	} else {
		const tableId = toNumber(table ?? raw.table_id)
		if (tableId !== undefined) {
			mapped.table = tableId as unknown as Table
		}
	}

	const rawExtent = raw.extent
	if (Array.isArray(rawExtent)) {
		mapped.extent = rawExtent.map((value) => String(value))
	} else if (typeof rawExtent === 'string') {
		mapped.extent = rawExtent.split(',')
	}

	return mapped
}
