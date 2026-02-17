import type { Position } from '@/platform/device/geolocation';

interface CreatePositionOptions {
  fallback?: Position | null;
  timestamp?: number;
}

/**
 * Build a Capacitor-like Position object from lon/lat coordinates.
 * Useful when coordinates come from map center or parsed geometry.
 */
export function createPositionFromLonLat(
  longitude: number,
  latitude: number,
  options: CreatePositionOptions = {}
): Position {
  const { fallback = null, timestamp = Date.now() } = options;

  return {
    coords: {
      longitude,
      latitude,
      accuracy: fallback?.coords.accuracy ?? 0,
      altitude: fallback?.coords.altitude ?? null,
      altitudeAccuracy: fallback?.coords.altitudeAccuracy ?? null,
      heading: fallback?.coords.heading ?? null,
      speed: fallback?.coords.speed ?? null,
    },
    timestamp,
  };
}
