import type { CommunityLayer, Table } from '@ign/mobile-core'

export interface CommunityLayerDirectContributionState {
  editable: boolean
  locked: boolean
  pendingChangesCount: number
}

export interface CommunityLayerDirectContributionOptions {
  pendingChangesCount: number
  locked?: boolean
}

interface DirectContributionLayerShape {
  role?: string
}

function hasEditableRole(role: string | undefined): boolean | undefined {
  if (typeof role !== 'string') {
    return undefined
  }

  return role
    .split(',')
    .some((value) => value.trim() === 'edit')
}

function hasTableTileZoom(table: Table): boolean {
  return Boolean(table.tileZoomLevel)
}

export function getCommunityLayerDirectContributionState(
  layer: CommunityLayer,
  options: CommunityLayerDirectContributionOptions
): CommunityLayerDirectContributionState | undefined {
  const table = layer.table
  // Direct contribution only applies to collaborative layers backed by a table
  if (!table || typeof table !== 'object') {
    return undefined
  }

  const layerAny = layer as CommunityLayer & DirectContributionLayerShape
  const readOnly = table.readOnly === true
  const tableEditable =
    typeof table.editable === 'boolean'
      ? table.editable
      : !readOnly
  const editableRole = hasEditableRole(layerAny.role)
  // Legacy editability is a combination of table capabilities and layer rights
  const hasEditionCapability =
    tableEditable &&
    !readOnly &&
    hasTableTileZoom(table) &&
    (editableRole ?? tableEditable)

  return {
    editable: hasEditionCapability,
    // A layer is shown as locked either because it cannot be edited at all
    // or because the user locally disabled edition for this layer
    locked: !hasEditionCapability || options.locked === true,
    // The pending count is injected by the caller; this helper does not inspect
    // sources or storage to derive it
    pendingChangesCount: options.pendingChangesCount,
  }
}
