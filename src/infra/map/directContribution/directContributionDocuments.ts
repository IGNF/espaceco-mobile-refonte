import {
  isDirectContributionDocumentValue,
  type DirectContributionDocumentDraftFile,
} from '@/domain/community/directContributionForm';

interface CollaborativeDocumentDraft {
  kind: 'document';
  documentId: string | null;
  file: DirectContributionDocumentDraftFile | null;
  removed: boolean;
}

function createCollaborativeDocumentDraft(
  documentId: string | null,
  file: DirectContributionDocumentDraftFile
): CollaborativeDocumentDraft {
  return {
    kind: 'document',
    documentId,
    file,
    removed: false,
  };
}

function extractBase64Content(dataUrl: string): string {
  const separatorIndex = dataUrl.indexOf(',');
  if (separatorIndex === -1 || separatorIndex === dataUrl.length - 1) {
    return '';
  }

  return dataUrl.slice(separatorIndex + 1);
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Document file could not be serialized'));
        return;
      }

      const contentBase64 = extractBase64Content(result);
      if (!contentBase64) {
        reject(new Error('Document file could not be serialized'));
        return;
      }

      resolve(contentBase64);
    };

    reader.onerror = () => {
      reject(reader.error ?? new Error('Document file could not be read'));
    };

    reader.readAsDataURL(file);
  });
}

async function serializeDocumentDraftFile(file: File): Promise<DirectContributionDocumentDraftFile> {
  return {
    name: file.name,
    mimeType: file.type || null,
    contentBase64: await readFileAsBase64(file),
  };
}

/**
 * Convert document form values into serializable collaborative drafts before
 * they are stored on the feature/source. Upload is deferred to submit time in
 * mobile-core, but the source cache still needs plain JSON values here.
 */
export async function serializeDirectContributionDocumentAttributes(
  attributes: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const nextAttributes = { ...attributes };

  for (const [attributeName, attributeValue] of Object.entries(nextAttributes)) {
    if (!isDirectContributionDocumentValue(attributeValue)) {
      continue;
    }

    const fileValue = attributeValue.file;

    if (fileValue instanceof File) {
      const serializedFile = await serializeDocumentDraftFile(fileValue);
      nextAttributes[attributeName] = createCollaborativeDocumentDraft(
        attributeValue.documentId,
        serializedFile
      );
      continue;
    }

    if (
      fileValue &&
      typeof fileValue === 'object' &&
      typeof (fileValue as DirectContributionDocumentDraftFile).name === 'string' &&
      typeof (fileValue as DirectContributionDocumentDraftFile).contentBase64 === 'string'
    ) {
      nextAttributes[attributeName] = createCollaborativeDocumentDraft(
        attributeValue.documentId,
        fileValue as DirectContributionDocumentDraftFile
      );
      continue;
    }

    nextAttributes[attributeName] = attributeValue.removed
      ? null
      : attributeValue.documentId;
  }

  return nextAttributes;
}
