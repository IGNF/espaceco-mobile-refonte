export {};

type GpsSourceType = 'internal' | 'external';

interface GpsSourceInfo {
  type?: GpsSourceType;
  name?: string;
  id?: string;
  identifier?: string;
  typeIsGuess?: boolean;
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
  }
}
