import { AppError, toAppError } from "@/shared/errors/appError";
import { Device } from "@capacitor/device";
import { AppLauncher } from '@capacitor/app-launcher';

export async function openInMapApp(latitude: number, longitude: number) {
  try {
    if (!latitude || !longitude) {
      throw new AppError({
        kind: 'invalidParameter',
        translationKey: 'reports.createOrEdit.actions.invalidParameter',
        message: 'Latitude and longitude are required',
      });
    }

    const os = (await (Device.getInfo())).platform;

    const launchUrl: string = os === 'ios' ? 'maps://?q=' + latitude + ',' + longitude : 'geo://0,0?q=' + latitude + ',' + longitude;
    const result = await AppLauncher.openUrl({ url: launchUrl });
    if (!result.completed) {
      throw new AppError({
        kind: 'unknown',
        translationKey: 'reports.createOrEdit.actions.unknown',
        message: 'Failed to open map app',
      });
    }
  } catch (error) {
    throw toAppError(error);
  }
}