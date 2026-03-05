export {};

type GpsSourceType = 'internal' | 'external';

interface GpsSourceInfo {
  type?: GpsSourceType;
  name?: string;
  id?: string;
  identifier?: string;
  typeIsGuess?: boolean;
}

interface BluetoothDeviceInfo {
  id: string;
  name: string;
  class?: number;
}

interface BluetoothSerialPlugin {
  list: (
    onSuccess: (devices: BluetoothDeviceInfo[]) => void,
    onError: (error: unknown) => void
  ) => void;
  connect: (
    deviceId: string,
    onSuccess: (result: unknown) => void,
    onError: (error: unknown) => void
  ) => void;
  disconnect: (onSuccess?: () => void, onError?: (error: unknown) => void) => void;
  isConnected: (onSuccess: () => void, onError: (error: unknown) => void) => void;
}

interface ListPickerPlugin {
  showPicker: (
    options: {
      title?: string;
      selectedValue?: string;
      items: Array<{ value: string; text: string }>;
    },
    onSuccess: (selectedValue: string) => void,
    onError: (error: unknown) => void
  ) => void;
}

declare global {
  interface Geolocation {
    hasSource?: boolean;
    canSetSource?: boolean;
    setSource?: (
      source: GpsSourceType,
      onSuccess?: (sourceInfo: GpsSourceInfo) => void,
      onError?: (error: unknown) => void
    ) => void;
  }

  interface Window {
    cordova?: unknown;
    bluetoothSerial?: BluetoothSerialPlugin;
    plugins?: {
      listpicker?: ListPickerPlugin;
    };
  }
}
