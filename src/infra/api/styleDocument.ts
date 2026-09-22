import { Capacitor, CapacitorHttp } from '@capacitor/core';
import type { ApiClient } from 'collaboratif-client-api';

/**
 * Native WebViews block axios on `/gcms/style/image` (CORS).
 * Android/iOS therefore fetch the image through CapacitorHttp.
 */
export async function getStyleDocument(apiClient: ApiClient, url: string) {
  if (!Capacitor.isNativePlatform()) {
    return apiClient.getDocument(url);
  }

  const token = await apiClient.clientAuth?.fetchToken(null);
  const response = await CapacitorHttp.get({
    url,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    responseType: 'arraybuffer',
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Failed to load style image (${response.status})`);
  }

  return response;
}
