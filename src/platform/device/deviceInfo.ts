import { DeviceInfo } from '@capgo/capacitor-device-info';
import type { PluginListenerHandle } from '@capacitor/core';
import type {
  DeviceInfoSnapshot,
  DeviceInfoUpdate,
  MonitoringOptions,
  MonitoringState,
} from '@capgo/capacitor-device-info';

export type {
  CpuInfo,
  DeviceInfoSnapshot,
  DeviceInfoUpdate,
  GpuInfo,
  MemoryInfo,
  MonitoringOptions,
  MonitoringState,
  OnboardSensorDescriptor,
  OnboardSensorReading,
  OnboardSensorsInfo,
  StorageInfo,
  ThermalState,
} from '@capgo/capacitor-device-info';

/**
 * Thin Capacitor wrapper around @capgo/capacitor-device-info.
 * No business logic: session handling lives in the performance feature.
 */
export class EspaceCo_DeviceInfo {
  static getInfo(): Promise<DeviceInfoSnapshot> {
    return DeviceInfo.getInfo();
  }

  static startMonitoring(options?: MonitoringOptions) {
    return DeviceInfo.startMonitoring(options);
  }

  static stopMonitoring() {
    return DeviceInfo.stopMonitoring();
  }

  static isMonitoring(): Promise<MonitoringState> {
    return DeviceInfo.isMonitoring();
  }

  static addUpdateListener(
    listener: (sample: DeviceInfoUpdate) => void,
  ): Promise<PluginListenerHandle> {
    return DeviceInfo.addListener('deviceInfoUpdate', listener);
  }

  static removeAllListeners(): Promise<void> {
    return DeviceInfo.removeAllListeners();
  }

  static getPluginVersion(): Promise<string> {
    return DeviceInfo.getPluginVersion().then((result) => result.version);
  }
}
