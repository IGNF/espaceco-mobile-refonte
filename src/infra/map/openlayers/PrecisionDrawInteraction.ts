import Feature from 'ol/Feature';
import type Map from 'ol/Map';
import type MapBrowserEvent from 'ol/MapBrowserEvent';
import type { Coordinate } from 'ol/coordinate';
import Point from 'ol/geom/Point';
import type Draw from 'ol/interaction/Draw';
import Interaction from 'ol/interaction/Interaction';
import type Snap from 'ol/interaction/Snap';
import VectorLayer from 'ol/layer/Vector';
import type { Pixel } from 'ol/pixel';
import VectorSource from 'ol/source/Vector';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';

import { getColorCode } from '@/shared/utils/color';

/** How long the finger must stay still before the crosshair appears, in milliseconds. */
const LONG_PRESS_DELAY = 400;

/** How far the finger can slip while held still, in pixels. Same value as the click tolerance of Draw. */
const LONG_PRESS_TOLERANCE = 6;

/** Distance between the finger and the crosshair, in pixels, so the crosshair stays visible above the finger. */
const CROSSHAIR_OFFSET = 70;

function createCrosshairStyle(color: string): Style[] {
  return [
    new Style({
      image: new CircleStyle({
        radius: 16,
        stroke: new Stroke({ color: '#ffffff', width: 5 }),
      }),
    }),
    new Style({
      image: new CircleStyle({
        radius: 16,
        stroke: new Stroke({ color, width: 2 }),
      }),
    }),
    new Style({
      image: new CircleStyle({
        radius: 4,
        fill: new Fill({ color }),
        stroke: new Stroke({ color: '#ffffff', width: 1 }),
      }),
    }),
  ];
}

function getPixelDistance(left: Pixel, right: Pixel): number {
  return Math.hypot(left[0] - right[0], left[1] - right[1]);
}

export class PrecisionDrawInteraction extends Interaction {
  private readonly draw: Draw;
  private readonly isPointDraw: boolean;
  private snaps: Snap[] = [];

  private heldDownEvent: MapBrowserEvent | null = null;
  private longPressTimeout: ReturnType<typeof setTimeout> | undefined;
  private isGivingBackDownEvent = false;
  private isAiming = false;

  private readonly crosshairStyle = createCrosshairStyle(getColorCode('dark'));
  private readonly snappedCrosshairStyle = createCrosshairStyle(getColorCode('danger'));

  private readonly crosshairPoint = new Point([0, 0]);
  private readonly crosshairLayer = new VectorLayer({
    source: new VectorSource({
      features: [new Feature(this.crosshairPoint)],
    }),
  });

  /**
   * @param draw Draw interaction that receives the aimed vertices
   * @param isPointDraw Whether `draw` draws points rather than lines or polygons
   */
  constructor(draw: Draw, isPointDraw: boolean) {
    super();
    this.draw = draw;
    this.isPointDraw = isPointDraw;
  }

  /**
   * Snap interactions that attract the crosshair. An empty list turns snapping off.
   */
  public setSnaps(snaps: Snap[]): void {
    this.snaps = snaps;
  }

  public override setMap(map: Map | null): void {
    // The interaction leaves the map when the drawing mode changes: the gesture in progress is dropped.
    clearTimeout(this.longPressTimeout);
    this.heldDownEvent = null;
    this.stopAiming();
    super.setMap(map);
  }

  public override handleEvent(event: MapBrowserEvent): boolean {
    if (this.isGivingBackDownEvent) {
      return true;
    }

    switch (event.type) {
      case 'pointerdown':
        return this.handlePointerDown(event);
      case 'pointerdrag':
        return this.handlePointerDrag(event);
      case 'pointerup':
        return this.handlePointerUp(event);
      default:
        return true;
    }
  }

  private handlePointerDown(event: MapBrowserEvent): boolean {
    if (this.isAiming) {
      // A second finger is ignored while aiming.
      return false;
    }

    if (this.heldDownEvent) {
      // A second finger touches the map: it is a pinch, not a long press.
      this.giveBackHeldDownEvent();
      return true;
    }

    this.heldDownEvent = event;
    this.longPressTimeout = setTimeout(() => this.startAiming(), LONG_PRESS_DELAY);
    return false;
  }

  private handlePointerDrag(event: MapBrowserEvent): boolean {
    if (this.isAiming) {
      this.moveCrosshair(event.pixel);
      this.preventBrowserScroll(event);
      return false;
    }

    if (!this.heldDownEvent) {
      return true;
    }

    if (getPixelDistance(event.pixel, this.heldDownEvent.pixel) <= LONG_PRESS_TOLERANCE) {
      // The finger slips a little while held still: the map does not move.
      this.preventBrowserScroll(event);
      return false;
    }

    // The finger moves before the end of the long press: it is a pan.
    this.giveBackHeldDownEvent();
    return true;
  }

  private handlePointerUp(event: MapBrowserEvent): boolean {
    if (this.isAiming) {
      // OpenLayers also reports a touch cancelled by the system as a pointerup. No vertex is added then.
      if (event.originalEvent.type !== 'pointercancel') {
        this.addAimedVertex();
      }
      this.stopAiming();
      return false;
    }

    if (this.heldDownEvent) {
      // The finger is lifted before the end of the long press: it is a tap, which Draw handles as usual.
      this.giveBackHeldDownEvent();
    }
    return true;
  }

  private preventBrowserScroll(event: MapBrowserEvent): void {
    event.originalEvent.preventDefault();
  }

  /**
   * Sends the held pointerdown event to the other interactions, so they handle the gesture as if
   * this interaction did not exist.
   */
  private giveBackHeldDownEvent(): void {
    clearTimeout(this.longPressTimeout);
    const downEvent = this.heldDownEvent!;
    this.heldDownEvent = null;

    this.isGivingBackDownEvent = true;
    this.getMap()!.handleMapBrowserEvent(downEvent);
    this.isGivingBackDownEvent = false;
  }

  private startAiming(): void {
    this.isAiming = true;
    this.moveCrosshair(this.heldDownEvent!.pixel);
    // The other interactions never receive this gesture.
    this.heldDownEvent = null;
    this.crosshairLayer.setMap(this.getMap());
  }

  private stopAiming(): void {
    this.isAiming = false;
    this.crosshairLayer.setMap(null);
  }

  private moveCrosshair(fingerPixel: Pixel): void {
    const crosshairPixel = [fingerPixel[0], fingerPixel[1] - CROSSHAIR_OFFSET];
    const snappedCoordinate = this.findSnappedCoordinate(crosshairPixel);

    if (snappedCoordinate) {
      this.crosshairPoint.setCoordinates(snappedCoordinate);
      this.crosshairLayer.setStyle(this.snappedCrosshairStyle);
    } else {
      this.crosshairPoint.setCoordinates(this.getMap()!.getCoordinateFromPixel(crosshairPixel));
      this.crosshairLayer.setStyle(this.crosshairStyle);
    }
  }

  /**
   * Returns the closest vertex or segment point that the Snap interactions attract the pixel to,
   * or null when no object is close enough.
   */
  private findSnappedCoordinate(pixel: Pixel): Coordinate | null {
    const map = this.getMap()!;
    const coordinate = map.getCoordinateFromPixel(pixel);
    let closestCoordinate: Coordinate | null = null;
    let closestDistance = Infinity;

    for (const snap of this.snaps) {
      const snapped = snap.snapTo(pixel, coordinate, map);
      if (!snapped) {
        continue;
      }

      const distance = getPixelDistance(snapped.vertexPixel!, pixel);
      if (distance < closestDistance) {
        closestCoordinate = snapped.vertex;
        closestDistance = distance;
      }
    }

    return closestCoordinate;
  }

  private addAimedVertex(): void {
    this.draw.appendCoordinates([this.crosshairPoint.getCoordinates()]);

    if (this.isPointDraw) {
      this.draw.finishDrawing();
    }
  }
}
