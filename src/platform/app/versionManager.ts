import { App } from '@capacitor/app';

export async function getAppVersion(): Promise<string | undefined> {
  const { version } = await App.getInfo();
  return version ?? undefined;
}