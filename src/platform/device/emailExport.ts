import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { EmailComposer } from 'capacitor-email-composer';

interface EmailTextFileOptions {
  filename: string;
  data: string;
  subject: string;
}

/**
 * Writes a generated text file to Capacitor's cache directory and opens the
 * native email composer with the cached file attached.
 */
export async function emailTextFile({
  filename,
  data,
  subject,
}: EmailTextFileOptions): Promise<void> {
  await Filesystem.writeFile({
    path: filename,
    data,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
    recursive: true,
  });

  const { uri } = await Filesystem.getUri({
    path: filename,
    directory: Directory.Cache,
  });

  await EmailComposer.open({
    subject,
    attachments: [
      {
        type: 'absolute',
        path: uri.replace(/^file:\/\//i, ''),
        name: filename,
      },
    ],
  });
}
