import { Toast, type ShowOptions } from '@capacitor/toast';

/**
 * Displays a toast and swallows runtime loading failures
 */
export async function showToastSafe(options: ShowOptions): Promise<void> {
  try {
    console.info('[Toast] Displaying toast', options);
    await Toast.show(options);
  } catch (error) {
    console.warn('[Toast] Failed to display toast', error);
  }
}
