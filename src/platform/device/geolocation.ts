/**
 * EspaceCo_Geolocation class
 * This class uses the Capacitor Geolocation plugin to get the user's location
 * and to watch the user's location.
 * It also checks the permissions and requests the permissions if needed.
 * 
 * See documentation: https://capacitorjs.com/docs/apis/geolocation
 */
import {
  Geolocation,
  type CallbackID,
  type PermissionStatus,
  type Position,
  type PositionOptions,
  type WatchPositionCallback,
} from '@capacitor/geolocation'

export type {
  CallbackID,
  PermissionStatus,
  Position,
  PositionOptions,
  WatchPositionCallback,
}

export class EspaceCo_Geolocation {
  static async checkPermissions(): Promise<PermissionStatus> {
    return await Geolocation.checkPermissions();
  }

  static async requestPermissions(): Promise<PermissionStatus> {
    return await Geolocation.requestPermissions();
  }

  static async getUsersLocation(options?: PositionOptions): Promise<Position | null> {
    try {
      const permissions = await this.checkPermissions()
      if (permissions.location !== 'granted') {
        const newPermissions = await this.requestPermissions()
        if (newPermissions.location !== 'granted') {
          return null;
        }
      }
      return await Geolocation.getCurrentPosition(options);
    } catch (error) {
      console.error('Error getting users location:', error);
      return null;
    }
  }

  static async watchUsersLocation(
    callback: WatchPositionCallback,
    options?: PositionOptions
  ): Promise<CallbackID | null> {
    try {
      const permissions = await this.checkPermissions()
      if (permissions.location !== 'granted') {
        const newPermissions = await this.requestPermissions()
        if (newPermissions.location !== 'granted') {
          return null;
        }
      }
      return await Geolocation.watchPosition(options ?? {}, callback);
    } catch (error) {
      console.error('Error watching users location:', error);
      return null;
    }
  }

  static async clearWatch(watchId: CallbackID): Promise<void> {
    if (!watchId) {
      return Promise.resolve();
    }
    return await Geolocation.clearWatch({ id: watchId });
  }
}
