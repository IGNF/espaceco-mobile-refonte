/**
 * EspaceCo_Geolocation class
 * This class centralizes geolocation access for the whole app.
 * It keeps Capacitor permission handling and uses a source-aware strategy:
 * - external GPS source: prefer navigator.geolocation (Cordova source override)
 * - internal source: prefer Capacitor geolocation, then fallback to navigator
 */
import {
  Geolocation,
  type CallbackID,
  type PermissionStatus,
  type Position,
  type PositionOptions,
  type WatchPositionCallback,
} from '@capacitor/geolocation';
import { EspaceCo_GpsSource } from '@/platform/device/gpsSource';

export type {
  CallbackID,
  PermissionStatus,
  Position,
  PositionOptions,
  WatchPositionCallback,
};

const NAVIGATOR_WATCH_PREFIX = 'navigator:';
const CAPACITOR_WATCH_PREFIX = 'capacitor:';

const navigatorWatchMap = new Map<CallbackID, number>();

function toCallbackId(value: string): CallbackID {
  return value as CallbackID;
}

function hasNavigatorGeolocation(): boolean {
  return typeof navigator !== 'undefined' && Boolean(navigator.geolocation);
}

/**
 * Registers a navigator watch and stores its native numeric id behind an app-level CallbackID.
 * This keeps a single clearWatch API for both navigator and Capacitor watch ids.
 */
function watchUsersLocationWithNavigator(
  callback: WatchPositionCallback,
  options?: PositionOptions
): CallbackID {
  const watchId = navigator.geolocation.watchPosition(
    (position) => callback(toPosition(position)),
    (error) => callback(null, error),
    options
  );

  const callbackId = toCallbackId(`${NAVIGATOR_WATCH_PREFIX}${watchId}`);
  navigatorWatchMap.set(callbackId, watchId);
  return callbackId;
}

/**
 * Reads one position from navigator.geolocation and adapts it to Capacitor Position shape.
 */
async function getUsersLocationWithNavigator(options?: PositionOptions): Promise<Position> {
  return await new Promise<Position>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(toPosition(position)),
      (error) => reject(error),
      options
    );
  });
}

async function getUsersLocationWithCapacitorFallback(options?: PositionOptions): Promise<Position> {
  try {
    return await Geolocation.getCurrentPosition(options);
  } catch (capacitorError) {
    if (hasNavigatorGeolocation()) {
      return await getUsersLocationWithNavigator(options);
    }
    throw capacitorError;
  }
}

async function watchUsersLocationWithCapacitorFallback(
  callback: WatchPositionCallback,
  options?: PositionOptions
): Promise<CallbackID> {
  try {
    const capacitorWatchId = await Geolocation.watchPosition(options ?? {}, callback);
    return toCallbackId(`${CAPACITOR_WATCH_PREFIX}${capacitorWatchId}`);
  } catch (capacitorError) {
    if (hasNavigatorGeolocation()) {
      return watchUsersLocationWithNavigator(callback, options);
    }
    throw capacitorError;
  }
}

/**
 * Navigator is primary only when external GPS is active/preferred.
 * For internal GPS, Capacitor is primary and navigator stays a fallback.
 */
async function shouldUseNavigatorAsPrimaryProvider(): Promise<boolean> {
  if (!hasNavigatorGeolocation()) return false;

  try {
    if (EspaceCo_GpsSource.getCurrentSource().type === 'external') {
      return true;
    }

    const preferredSource = await EspaceCo_GpsSource.getPreferredSource();
    return preferredSource === 'external';
  } catch {
    return false;
  }
}

function toPosition(value: GeolocationPosition): Position {
  return value as unknown as Position;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error ?? 'Unknown geolocation error');
}

export class EspaceCo_Geolocation {
  /**
   * Ensures location permission using Capacitor APIs.
   * Returns true on unsupported environments so navigator fallback can still be attempted.
   */
  static async ensurePermissions(): Promise<boolean> {
    try {
      const permissions = await this.checkPermissions();
      if (permissions.location !== 'granted') {
        const newPermissions = await this.requestPermissions();
        return newPermissions.location === 'granted';
      }
      return true;
    } catch {
      // On unsupported environments, navigator.geolocation may still work.
      return true;
    }
  }

  static async checkPermissions(): Promise<PermissionStatus> {
    return await Geolocation.checkPermissions();
  }

  static async requestPermissions(): Promise<PermissionStatus> {
    return await Geolocation.requestPermissions();
  }

  /**
   * Returns a single location with source-aware provider selection:
   * - external GPS: navigator first
   * - otherwise: Capacitor first, navigator fallback
   */
  static async getUsersLocation(options?: PositionOptions): Promise<Position | null> {
    try {
      const hasPermission = await this.ensurePermissions();
      if (!hasPermission) {
        return null;
      }

      if (await shouldUseNavigatorAsPrimaryProvider()) {
        return await getUsersLocationWithNavigator(options);
      }

      return await getUsersLocationWithCapacitorFallback(options);
    } catch (error) {
      console.error('Error getting users location:', toErrorMessage(error));
      return null;
    }
  }

  /**
   * Starts continuous location tracking with the same source-aware strategy as getUsersLocation.
   * Returned id must be passed to clearWatch.
   */
  static async watchUsersLocation(
    callback: WatchPositionCallback,
    options?: PositionOptions
  ): Promise<CallbackID | null> {
    try {
      const hasPermission = await this.ensurePermissions();
      if (!hasPermission) {
        return null;
      }

      if (await shouldUseNavigatorAsPrimaryProvider()) {
        return watchUsersLocationWithNavigator(callback, options);
      }

      return await watchUsersLocationWithCapacitorFallback(callback, options);
    } catch (error) {
      console.error('Error watching users location:', toErrorMessage(error));
      return null;
    }
  }

  /**
   * Clears a watch id created from either navigator or Capacitor provider.
   * Supports prefixed ids and legacy raw numeric navigator ids.
   */
  static async clearWatch(watchId: CallbackID): Promise<void> {
    if (!watchId) {
      return;
    }

    const nativeWatchId = navigatorWatchMap.get(watchId);
    if (nativeWatchId !== undefined) {
      navigatorWatchMap.delete(watchId);
      navigator.geolocation?.clearWatch(nativeWatchId);
      return;
    }

    const watchIdValue = String(watchId);
    if (watchIdValue.startsWith(CAPACITOR_WATCH_PREFIX)) {
      const capacitorId = watchIdValue.slice(CAPACITOR_WATCH_PREFIX.length);
      return await Geolocation.clearWatch({ id: capacitorId });
    }

    if (/^\d+$/.test(watchIdValue)) {
      navigator.geolocation?.clearWatch(Number(watchIdValue));
      return;
    }

    return await Geolocation.clearWatch({ id: watchIdValue });
  }
}
