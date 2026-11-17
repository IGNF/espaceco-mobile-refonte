import type { RefObject } from 'react';

import type Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import type LineString from 'ol/geom/LineString';
import type Polygon from 'ol/geom/Polygon';
import type Draw from 'ol/interaction/Draw';

import type { SketchManager } from '@ign/mobile-core';

/**
 * Returns the Draw interaction of the current mode. SketchManager does not expose it publicly.
 */
export function getSketchDraw(manager: SketchManager | null): Draw | null {
  return (manager as unknown as { drawInteraction: Draw | null } | null)?.drawInteraction ?? null;
}

function isDrawing(draw: Draw): boolean {
  // OpenLayers has no public getter for the sketch in progress.
  return Boolean((draw as unknown as { sketchFeature_: unknown }).sketchFeature_);
}

function getDrawnVertices(feature: Feature<Geometry>) {
  const geometry = feature.getGeometry();

  switch (geometry?.getType()) {
    case 'Polygon':
      return {
        mode: 'draw-polygon' as const,
        // A closed ring repeats its first vertex at the end. That copy is not a corner of the open drawing.
        coordinates: (geometry as Polygon).getCoordinates()[0].slice(0, -1),
      };
    case 'LineString':
      return {
        mode: 'draw-linestring' as const,
        coordinates: (geometry as LineString).getCoordinates(),
      };
    default:
      return null;
  }
}

/**
 * Undoes the latest drawing step: removes the vertex being drawn, or reopens the line or polygon held by `finishedSketchRef`.
 * Returns false when there is no such step, so the caller can fall back on SketchManager's own undo.
 */
export function undoDrawingStep(
  manager: SketchManager,
  finishedSketchRef: RefObject<Feature<Geometry> | null>,
): boolean {
  const draw = getSketchDraw(manager);
  if (draw && isDrawing(draw)) {
    draw.removeLastPoint();
    return true;
  }

  const finishedSketch = finishedSketchRef.current;
  const drawn =
    finishedSketch && manager.getFeatures().includes(finishedSketch)
      ? getDrawnVertices(finishedSketch)
      : null;
  if (!drawn) {
    return false;
  }

  finishedSketchRef.current = null;
  manager.undo();
  manager.setMode(drawn.mode);

  const reopenedDraw = getSketchDraw(manager)!;
  // OpenLayers 10.11 leaves a polygon's cursor on its first vertex after appendCoordinates (10.7 does not).
  // The drawing then looks closed, and the next removeLastPoint takes away a real vertex.
  // Appending the last vertex twice and removing the copy puts the cursor back on the last vertex.
  reopenedDraw.appendCoordinates([...drawn.coordinates, drawn.coordinates[drawn.coordinates.length - 1]]);
  reopenedDraw.removeLastPoint();
  return true;
}
