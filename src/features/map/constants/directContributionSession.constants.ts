import type { ComponentType } from 'react';
import type { InteractionMode, SketchAction } from '@ign/mobile-core';

import IconClose from '@/shared/assets/icons/icon-close.svg?react';
import IconPoint from '@/shared/assets/icons/icon-point.svg?react';
import IconLine from '@/shared/assets/icons/icon-line.svg?react';
import IconPolygon from '@/shared/assets/icons/icon-polygon.svg?react';
import IconEdit from '@/shared/assets/icons/icon-edit.svg?react';
import IconSelect from '@/shared/assets/icons/icon-select.svg?react';
import IconDelete from '@/shared/assets/icons/icon-delete.svg?react';
import IconReset from '@/shared/assets/icons/icon-reset.svg?react';

export const DEFAULT_DIRECT_CONTRIBUTION_MODE: Exclude<InteractionMode, null> = 'select';

export interface DirectContributionToolDefinition {
  id: string;
  icon: ComponentType<{ className?: string }>;
  labelKey: string;
  activeMode?: Exclude<InteractionMode, null>;
  action?: SketchAction;
  drawGeometryType?: 'Point' | 'LineString' | 'Polygon';
}

export const DIRECT_CONTRIBUTION_TOOL_DEFINITIONS: DirectContributionToolDefinition[] = [
  {
    id: 'drawPoint',
    icon: IconPoint,
    labelKey: 'layers.directContribution.tools.drawPoint',
    activeMode: 'draw-point',
    action: 'drawPoint',
    drawGeometryType: 'Point',
  },
  {
    id: 'drawLine',
    icon: IconLine,
    labelKey: 'layers.directContribution.tools.drawLine',
    activeMode: 'draw-linestring',
    action: 'drawLine',
    drawGeometryType: 'LineString',
  },
  {
    id: 'drawPolygon',
    icon: IconPolygon,
    labelKey: 'layers.directContribution.tools.drawPolygon',
    activeMode: 'draw-polygon',
    action: 'drawPolygon',
    drawGeometryType: 'Polygon',
  },
  {
    id: 'modify',
    icon: IconEdit,
    labelKey: 'layers.directContribution.tools.modify',
    activeMode: 'modify',
    action: 'modify',
  },
  {
    id: 'select',
    icon: IconSelect,
    labelKey: 'layers.directContribution.tools.select',
    activeMode: 'select',
    action: 'select',
  },
  {
    id: 'delete',
    icon: IconDelete,
    labelKey: 'layers.directContribution.tools.delete',
    action: 'delete',
  },
  {
    id: 'undo',
    icon: IconReset,
    labelKey: 'layers.directContribution.tools.undo',
    action: 'undo',
  },
  {
    id: 'close',
    icon: IconClose,
    labelKey: 'layers.directContribution.tools.close',
  },
];

export function getDirectContributionToolActionById(toolId: string): SketchAction | null {
  const matchingTool = DIRECT_CONTRIBUTION_TOOL_DEFINITIONS.find((tool) => tool.id === toolId);
  return matchingTool?.action ?? null;
}
