import { NavMode, NavModes } from 'capacitor-android-nav-mode';

export const SimplifiedNavigationMode = {
  Buttons: 'buttons',
  Gesture: 'gesture',
} as const;

export type SimplifiedNavigationMode =
  (typeof SimplifiedNavigationMode)[keyof typeof SimplifiedNavigationMode];

export async function getNavigationMode(): Promise<SimplifiedNavigationMode> {
  const navigationMode = (await NavMode.getNavigationMode()).mode;
  return navigationMode === NavModes.ThreeButton || navigationMode === NavModes.TwoButton ? SimplifiedNavigationMode.Buttons : SimplifiedNavigationMode.Gesture;
}