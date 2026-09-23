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

function readContentType(headers: unknown): string {
  if (!headers || typeof headers !== 'object') {
    return 'image/png';
  }

  const record = headers as Record<string, unknown>;
  const value = record['content-type'] ?? record['Content-Type'];
  return typeof value === 'string' && value.length > 0 ? value : 'image/png';
}

// Web returns an ArrayBuffer. CapacitorHttp returns the same payload as base64.
export function createStyleImageObjectUrl(response: { data?: unknown; headers?: unknown }): string {
  const contentType = readContentType(response.headers);

  if (response.data instanceof ArrayBuffer) {
    return URL.createObjectURL(new Blob([response.data], { type: contentType }));
  }

  if (typeof response.data !== 'string' || response.data.length === 0) {
    throw new Error('Style image response has no data');
  }

  const binary = atob(response.data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return URL.createObjectURL(new Blob([bytes], { type: contentType }));
}
