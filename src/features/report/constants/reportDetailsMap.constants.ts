import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';

// Diminution de l'opacité des couches affichées, pour mettre en avant le signalement
export const REPORT_DETAILS_MAP_DIMMED_OPACITY_FACTOR = 0.25;

export const REPORT_DETAILS_ATTACHMENT_HIGHLIGHT_LAYER_NAME = 'ReportAttachmentHighlight';
export const REPORT_DETAILS_ATTACHMENT_HIGHLIGHT_LAYER_TITLE = 'Mise en évidence du signalement';

// Style de la mise en évidence du signalement
export const REPORT_DETAILS_ATTACHMENT_HIGHLIGHT_STYLE = [
  new Style({
    stroke: new Stroke({
      color: 'rgba(255, 255, 255, 0.95)',
      width: 10,
      lineCap: 'round',
      lineJoin: 'round',
    }),
    image: new CircleStyle({
      radius: 12,
      fill: new Fill({ color: 'rgba(255, 255, 255, 0.95)' }),
      stroke: new Stroke({
        color: 'rgba(0, 0, 0, 0.18)',
        width: 1,
      }),
    }),
  }),
  new Style({
    stroke: new Stroke({
      color: '#ff9d00',
      width: 5,
      lineCap: 'round',
      lineJoin: 'round',
    }),
    fill: new Fill({
      color: 'rgba(255, 157, 0, 0.25)',
    }),
    image: new CircleStyle({
      radius: 8,
      fill: new Fill({ color: '#f28f58' }),
      stroke: new Stroke({
        color: '#ffffff',
        width: 3,
      }),
    }),
  }),
];
