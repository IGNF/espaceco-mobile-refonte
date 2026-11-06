import type { ComponentType } from 'react';
import type { TFunction } from 'i18next';
import type { InteractionMode, SketchAction } from '@ign/mobile-core';

import type { MapToolbarItem } from '@/features/map/components/MapToolbar';

import IconClose from '@/shared/assets/icons/icon-close.svg?react';
import IconPoint from '@/shared/assets/icons/icon-point.svg?react';
import IconLine from '@/shared/assets/icons/icon-line.svg?react';
import IconPolygon from '@/shared/assets/icons/icon-polygon.svg?react';
import IconEdit from '@/shared/assets/icons/icon-edit.svg?react';
import IconSelect from '@/shared/assets/icons/icon-select.svg?react';
import IconDelete from '@/shared/assets/icons/icon-delete.svg?react';
import IconReset from '@/shared/assets/icons/icon-reset.svg?react';

export type SketchMode = Exclude<InteractionMode, null>;

export type SketchToolId =
  | 'drawPoint'
  | 'drawLine'
  | 'drawPolygon'
  | 'modify'
  | 'select'
  | 'delete'
  | 'undo'
  | 'close';

export interface SketchTool {
  id: SketchToolId;
  Icon: ComponentType<{ className?: string }>;
  activeMode?: SketchMode;
  action?: SketchAction;
  drawGeometryType?: 'Point' | 'LineString' | 'Polygon';
}

const SKETCH_TOOLS: SketchTool[] = [
  { id: 'drawPoint', Icon: IconPoint, activeMode: 'draw-point', action: 'drawPoint', drawGeometryType: 'Point' },
  { id: 'drawLine', Icon: IconLine, activeMode: 'draw-linestring', action: 'drawLine', drawGeometryType: 'LineString' },
  { id: 'drawPolygon', Icon: IconPolygon, activeMode: 'draw-polygon', action: 'drawPolygon', drawGeometryType: 'Polygon' },
  { id: 'modify', Icon: IconEdit, activeMode: 'modify', action: 'modify' },
  { id: 'select', Icon: IconSelect, activeMode: 'select', action: 'select' },
  { id: 'delete', Icon: IconDelete, action: 'delete' },
  { id: 'undo', Icon: IconReset, action: 'undo' },
  { id: 'close', Icon: IconClose },
];

export function getSketchToolbarItems(
  labelKeys: Record<SketchToolId, string>,
  currentMode: SketchMode,
  t: TFunction,
  isDisabled?: (tool: SketchTool) => boolean,
): MapToolbarItem[] {
  return SKETCH_TOOLS.map((tool) => ({
    id: tool.id,
    Icon: tool.Icon,
    label: t(labelKeys[tool.id]),
    active: tool.activeMode === currentMode,
    disabled: isDisabled?.(tool),
  }));
}

export function getSketchToolAction(toolId: string): SketchAction | null {
  return SKETCH_TOOLS.find((tool) => tool.id === toolId)?.action ?? null;
}
