type DeviceOrientationPermissionState = 'granted' | 'denied' | 'prompt';

type DeviceOrientationEventWithCompass = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
};

type DeviceOrientationEventConstructorWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<DeviceOrientationPermissionState>;
};

export interface DeviceHeading {
  heading: number;
}

export type DeviceHeadingCallback = (heading: DeviceHeading) => void;

function normalizeHeading(heading: number): number {
  return ((heading % 360) + 360) % 360;
}

function getCompassHeading(event: DeviceOrientationEvent): number | null {
  const webkitCompassHeading = (event as DeviceOrientationEventWithCompass).webkitCompassHeading;
  if (typeof webkitCompassHeading === 'number') {
    return normalizeHeading(webkitCompassHeading);
  }

  if (event.alpha === null) {
    return null;
  }

  return normalizeHeading(360 - event.alpha);
}

export class EspaceCo_DeviceOrientation {
  static async ensurePermissions(): Promise<boolean> {
    const DeviceOrientation = DeviceOrientationEvent as DeviceOrientationEventConstructorWithPermission;
    if (typeof DeviceOrientation.requestPermission !== 'function') {
      return true;
    }

    try {
      return await DeviceOrientation.requestPermission() === 'granted';
    } catch {
      return false;
    }
  }

  static watchDeviceHeading(callback: DeviceHeadingCallback): () => void {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      const heading = getCompassHeading(event);
      if (heading === null) {
        return;
      }

      callback({ heading });
    };

    window.addEventListener('deviceorientationabsolute', handleOrientation);
    window.addEventListener('deviceorientation', handleOrientation);

    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }
}
