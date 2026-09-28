import { Capacitor } from '@capacitor/core';
import { FileSystem } from '@ign/mobile-device';

interface ExportFilePart {
  path: string;
  data: string;
  encoding: 'utf8' | 'base64';
}

/**
 * Builds the YYYYMMDD_HHMMSS stamp used in export folder and file names.
 */
export function exportDateStamp(date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${date.getFullYear()}${month}${day}_${hours}-${minutes}-${seconds}`;
}

/**
 * Hands one text file to the user.
 * Web downloads it. Android writes it under Download. iOS opens the share sheet.
 */
export async function writeExportFile(
  folderName: string,
  fileName: string,
  contents: string
): Promise<void> {
  await writeExportFiles(folderName, [{ path: fileName, data: contents, encoding: 'utf8' }]);
}

/**
 * Hands several export files to the user in one step.
 * Web downloads them. Android writes them under Download. iOS opens one share sheet.
 */
export async function writeExportFiles(folderName: string, files: ExportFilePart[]): Promise<void> {
  const platform = Capacitor.getPlatform();

  if (platform === 'web') {
    for (const file of files) {
      downloadBlob(fileNameOf(file.path), toBlob(file));
    }
    return;
  }

  if (platform === 'ios') {
    const shared = await shareFiles(files.map(toSharedFile));
    if (!shared) throw new Error('File sharing is not available');
    return;
  }

  if (platform === 'android') {
    for (const file of files) {
      await FileSystem.writeFile({
        path: `Download/${folderName}/${file.path}`,
        data: file.data,
        directory: 'EXTERNAL_STORAGE',
        encoding: file.encoding,
        recursive: true,
      });
    }
    return;
  }
}

export function downloadTextFile(fileName: string, contents: string): void {
  downloadBlob(fileName, new Blob([contents], { type: 'application/json' }));
}

export async function shareTextFile(fileName: string, contents: string): Promise<boolean> {
  return shareFiles([new File([contents], fileName, { type: 'application/json' })]);
}

function downloadBlob(fileName: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

async function shareFiles(files: File[]): Promise<boolean> {
  if (!navigator.canShare?.({ files })) return false;

  try {
    await navigator.share({ files });
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return true;
    return false;
  }
}

/**
 * Helpers for file operations.
 * If needed in the future, we can move these to a separate file (see shared/utils/blob.ts)
 */

function toSharedFile(file: ExportFilePart): File {
  const fileName = fileNameOf(file.path);
  return new File([toBlob(file)], fileName, { type: mimeTypeOf(fileName) });
}

function toBlob(file: ExportFilePart): Blob {
  const type = mimeTypeOf(fileNameOf(file.path));
  if (file.encoding === 'utf8') return new Blob([file.data], { type });
  return new Blob([base64ToBytes(file.data)], { type });
}

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
  return new Uint8Array(bytes);
}

function fileNameOf(path: string): string {
  return path.split('/').pop() ?? path;
}

function mimeTypeOf(fileName: string): string {
  if (fileName.endsWith('.png')) return 'image/png';
  if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/json';
}
