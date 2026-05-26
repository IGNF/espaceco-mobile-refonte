import {
  CollabStyler,
  type CommunityLayer,
  type LayerStyle,
  type Table,
} from '@ign/mobile-core';
import type { LayerStyleChoice } from '@/features/map/types/layerGroups';

export const DEFAULT_COLLAB_STYLE_ID = 'default';

const collabStylePresets = new CollabStyler().presets as unknown as Record<string, unknown>;

function getStyleId(style: LayerStyle): string | null {
  return style.id == null ? null : String(style.id);
}

function getStyleLabel(style: LayerStyle): string {
  return style.name
    ? style.name
    : `Style ${getStyleId(style) ?? ''}`.trim();
}

function getDeclaredStyles(table: Table): LayerStyle[] {
  const styles = table.styles ? [...table.styles] : [];

  if (table.style && styles.length === 0) {
    styles.push(table.style);
  }

  return styles;
}

function canChooseLayerStyle(table: Table): boolean {
  return getDeclaredStyles(table).length > 1 || hasDefaultCollabStyle(table);
}

/** Returns whether mobile-core provides a hard-coded fallback style for this table. */
export function hasDefaultCollabStyle(table: Table): boolean {
  return typeof collabStylePresets[table.name] === 'function';
}

/** Returns whether the layer should expose the style picker action. */
export function hasLayerStyleChoices(layer: CommunityLayer): boolean {
  const table = layer.table;
  if (!table) {
    return false;
  }

  return canChooseLayerStyle(table);
}

/** Builds the list of selectable styles shown by the layer details panel. */
export function getLayerStyleChoices(layer: CommunityLayer, defaultStyleLabel: string): LayerStyleChoice[] {
  const table = layer.table;
  if (!table) {
    return [];
  }

  const styles = getDeclaredStyles(table);
  const hasDefaultStyle = hasDefaultCollabStyle(table);

  if (styles.length <= 1 && !hasDefaultStyle) {
    return [];
  }

  const choices: LayerStyleChoice[] = hasDefaultStyle
    ? [{ id: DEFAULT_COLLAB_STYLE_ID, label: defaultStyleLabel }]
    : [];

  for (const style of styles) {
    const id = getStyleId(style);
    if (!id) {
      continue;
    }

    choices.push({
      id,
      label: getStyleLabel(style),
    });
  }

  return choices;
}

/** Returns the currently selected style id, including the synthetic default style id. */
export function getSelectedLayerStyleId(layer: CommunityLayer): string | undefined {
  const style = layer.table?.style;
  if (!style) {
    return layer.table && hasDefaultCollabStyle(layer.table)
      ? DEFAULT_COLLAB_STYLE_ID
      : undefined;
  }

  return getStyleId(style) ?? undefined;
}

/** Returns a layer copy with its table style updated to the selected style. */
export function applyLayerStyleSelection(layer: CommunityLayer, styleId: string): CommunityLayer {
  const table = layer.table;
  if (!table) {
    return layer;
  }

  if (styleId === DEFAULT_COLLAB_STYLE_ID) {
    const styles = getDeclaredStyles(table);

    return {
      ...layer,
      table: {
        ...table,
        style: undefined,
        styles: styles.length > 0 ? styles : table.styles,
      },
    };
  }

  const selectedStyle = getDeclaredStyles(table).find(
    (style) => getStyleId(style) === styleId
  );
  if (!selectedStyle) {
    return layer;
  }

  return {
    ...layer,
    table: {
      ...table,
      style: selectedStyle,
    },
  };
}
