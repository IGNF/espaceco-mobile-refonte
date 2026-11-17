import type { SketchMode, SketchToolId } from '@/features/map/constants/sketchTools.constants';

export const DEFAULT_DIRECT_CONTRIBUTION_MODE: SketchMode = 'select';

export const DIRECT_CONTRIBUTION_TOOL_LABEL_KEYS: Record<SketchToolId, string> = {
  drawPoint: 'layers.directContribution.tools.drawPoint',
  drawLine: 'layers.directContribution.tools.drawLine',
  drawPolygon: 'layers.directContribution.tools.drawPolygon',
  modify: 'layers.directContribution.tools.modify',
  select: 'layers.directContribution.tools.select',
  delete: 'layers.directContribution.tools.delete',
  undo: 'layers.directContribution.tools.undo',
  close: 'layers.directContribution.tools.close',
};
