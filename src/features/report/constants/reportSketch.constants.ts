import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';

import type { SketchMode, SketchToolId } from '@/features/map/constants/sketchTools.constants';

export const DEFAULT_SKETCH_MODE: SketchMode = 'draw-linestring';

export const SKETCH_LAYER_NAME = 'ReportSketchDraft';

export const SKETCH_LAYER_TITLE = 'Croquis temporaire';

export const SKETCH_TOOL_LABEL_KEYS: Record<SketchToolId, string> = {
  drawPoint: 'reports.createOrEdit.form.sketchToolPoint',
  drawLine: 'reports.createOrEdit.form.sketchToolLine',
  drawPolygon: 'reports.createOrEdit.form.sketchToolPolygon',
  modify: 'reports.createOrEdit.form.sketchToolModify',
  select: 'reports.createOrEdit.form.sketchToolSelect',
  delete: 'reports.createOrEdit.form.sketchToolDelete',
  undo: 'reports.createOrEdit.form.sketchToolUndo',
  close: 'reports.createOrEdit.form.sketchToolClose',
};

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
