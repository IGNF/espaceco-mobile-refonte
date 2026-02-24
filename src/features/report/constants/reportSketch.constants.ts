import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';
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

export const DEFAULT_SKETCH_MODE: Exclude<InteractionMode, null> = 'draw-linestring';

export const SKETCH_LAYER_NAME = 'ReportSketchDraft';

export const SKETCH_LAYER_TITLE = 'Croquis temporaire';

export interface SketchToolDefinition {
  id: string;
  icon: ComponentType<{ className?: string }>;
  labelKey: string;
  activeMode?: Exclude<InteractionMode, null>;
  action?: SketchAction;
}

export const SKETCH_TOOL_DEFINITIONS: SketchToolDefinition[] = [
  {
    id: 'drawPoint',
    icon: IconPoint,
    labelKey: 'reports.createOrEdit.form.sketchToolPoint',
    activeMode: 'draw-point',
    action: 'drawPoint',
  },
  {
    id: 'drawLine',
    icon: IconLine,
    labelKey: 'reports.createOrEdit.form.sketchToolLine',
    activeMode: 'draw-linestring',
    action: 'drawLine',
  },
  {
    id: 'drawPolygon',
    icon: IconPolygon,
    labelKey: 'reports.createOrEdit.form.sketchToolPolygon',
    activeMode: 'draw-polygon',
    action: 'drawPolygon',
  },
  {
    id: 'modify',
    icon: IconEdit,
    labelKey: 'reports.createOrEdit.form.sketchToolModify',
    activeMode: 'modify',
    action: 'modify',
  },
  {
    id: 'select',
    icon: IconSelect,
    labelKey: 'reports.createOrEdit.form.sketchToolSelect',
    activeMode: 'select',
    action: 'select',
  },
  {
    id: 'delete',
    icon: IconDelete,
    labelKey: 'reports.createOrEdit.form.sketchToolDelete',
    action: 'delete',
  },
  {
    id: 'undo',
    icon: IconReset,
    labelKey: 'reports.createOrEdit.form.sketchToolUndo',
    action: 'undo',
  },
  {
    id: 'close',
    icon: IconClose,
    labelKey: 'reports.createOrEdit.form.sketchToolClose',
  },
];

export const SKETCH_STYLE = new Style({
  stroke: new Stroke({
    color: '#ff9d00',
    width: 4,
    lineCap: 'round',
    lineJoin: 'round',
  }),
  fill: new Fill({
    color: 'rgba(255, 157, 0, 0.2)',
  }),
  image: new CircleStyle({
    radius: 6,
    fill: new Fill({ color: '#ffffff' }),
    stroke: new Stroke({
      color: '#ff9d00',
      width: 2,
    }),
  }),
});

export function getSketchToolActionById(toolId: string): SketchAction | null {
  const matchingTool = SKETCH_TOOL_DEFINITIONS.find((tool) => tool.id === toolId);
  return matchingTool?.action ?? null;
}
