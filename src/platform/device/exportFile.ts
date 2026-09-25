import { Capacitor } from '@capacitor/core';
import { FileSystem } from '@ign/mobile-device';

/**
 * Hands an export file to the user.
 * Web downloads it. Android writes it under Download. iOS opens the share sheet.
 */
export async function writeExportFile(
  folderName: string,
  fileName: string,
  contents: string
): Promise<void> {
  const platform = Capacitor.getPlatform();

  if (platform === 'web') {
    downloadTextFile(fileName, contents);
    return;
  }

  if (platform === 'ios') {
    const shared = await shareTextFile(fileName, contents);
    if (shared) return;
    throw new Error('File sharing is not available');
  }

  await FileSystem.writeFile({
    path: `Download/${folderName}/${fileName}`,
    data: contents,
    directory: 'EXTERNAL_STORAGE',
    encoding: 'utf8',
    recursive: true,
  });
}

/**
 * Fallback for web platforms.
 */
export function downloadTextFile(fileName: string, contents: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Shares the file on iOS, because the native file system is not available.
 */
export async function shareTextFile(fileName: string, contents: string): Promise<boolean> {
  const file = new File([contents], fileName, { type: 'application/json' });
  if (!navigator.canShare?.({ files: [file] })) return false;

  try {
    await navigator.share({ files: [file] });
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return true;
    return false;
  }
}
