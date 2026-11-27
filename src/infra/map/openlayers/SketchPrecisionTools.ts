import type Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import type Draw from 'ol/interaction/Draw';
import Snap from 'ol/interaction/Snap';
import type OlMap from 'ol/Map';
import type VectorSource from 'ol/source/Vector';

import type { InteractionMode } from '@ign/mobile-core';

import { PrecisionDrawInteraction } from '@/infra/map/openlayers/PrecisionDrawInteraction';

/** Set the OpenLayers default pixel tolerance to 16 pixels to suit better on a touch screen. */
const SNAP_PIXEL_TOLERANCE = 16;

/**
 * Adds snapping and the precision mode (long press + crosshair) to the drawing tools of a SketchManager.
 *
 * Snap and the precision mode must receive pointer events before Draw and Modify: OpenLayers gives
 * events to the last interactions of the map first. Adding a Snap to the map indexes every feature of
 * its source, which can take a second on a phone, so the snaps stay on the map while snapping is on.
 * When the mode changes, it is the new Draw that is moved below them.
 */
export class SketchPrecisionTools {
  private readonly map: OlMap;
  private mode: InteractionMode = null;
  private snaps: Snap[] = [];
  private precisionDraw: PrecisionDrawInteraction | null = null;

  constructor(map: OlMap) {
    this.map = map;
  }

  public handleModeChange(mode: InteractionMode, draw: Draw | null): void {
    if (this.precisionDraw) {
      this.map.removeInteraction(this.precisionDraw);
      this.precisionDraw = null;
    }

    this.mode = mode;

    if (draw) {
      this.moveDrawBelowSnaps(draw);
      this.precisionDraw = new PrecisionDrawInteraction(draw, mode === 'draw-point');
      this.addOnTop(this.precisionDraw);
    }

    this.updateSnapsActive();
  }

  /**
   * Makes the vertices being drawn or modified snap onto the features of these sources.
   * An empty list turns snapping off.
   */
  public setSnapSources(sources: VectorSource<Feature<Geometry>>[]): void {
    this.snaps.forEach((snap) => this.map.removeInteraction(snap));
    this.snaps = sources.map((source) => new Snap({
      source,
      pixelTolerance: SNAP_PIXEL_TOLERANCE,
    }));
    // This is the slow part: each Snap indexes the features of its source.
    this.snaps.forEach((snap) => this.map.addInteraction(snap));

    if (this.precisionDraw) {
      this.map.removeInteraction(this.precisionDraw);
      this.addOnTop(this.precisionDraw);
    }

    this.updateSnapsActive();
  }

  /**
   * The SketchManager adds each new Draw at the end of the interactions, above the snaps.
   */
  private moveDrawBelowSnaps(draw: Draw): void {
    if (this.snaps.length === 0) {
      return;
    }

    const interactions = this.map.getInteractions();
    interactions.remove(draw);
    interactions.insertAt(interactions.getArray().indexOf(this.snaps[0]), draw);
  }

  private addOnTop(precisionDraw: PrecisionDrawInteraction): void {
    precisionDraw.setSnaps(this.snaps);
    this.map.addInteraction(precisionDraw);
  }

  /**
   * Snapping only applies while drawing or modifying. Outside these modes, the snaps stay on the map
   * with their index, but do not handle events.
   */
  private updateSnapsActive(): void {
    const isSnapMode = this.precisionDraw !== null || this.mode === 'modify';
    this.snaps.forEach((snap) => snap.setActive(isSnapMode));
  }
}
