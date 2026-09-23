import { useEffect, useState } from 'react';

import type { CommunityLayerLegend } from '@/features/community/utils/communityLayerLegend';
import { collabApiClient } from '@/infra/api/collabApiClient';
import { createStyleImageObjectUrl, getStyleDocument } from '@/infra/api/styleDocument';

function legendImageUrls(legends: CommunityLayerLegend[]): string[] {
  const urls = new Set<string>();

  for (const legend of legends) {
    if (legend.imageUrl) {
      urls.add(legend.imageUrl);
    }

    for (const item of legend.items) {
      if (item.imageUrl) {
        urls.add(item.imageUrl);
      }
    }
  }

  return [...urls];
}

// Loads '/gcms/style/image' symbols with the collaboratif token. A plain img request is rejected with 401.
export function useLegendImages(legends: CommunityLayerLegend[]): Record<string, string> {
  const imageUrlsKey = legendImageUrls(legends).join('\n');
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const urls = imageUrlsKey === '' ? [] : imageUrlsKey.split('\n');
    if (urls.length === 0) {
      return;
    }

    let cancelled = false;
    const objectUrls: string[] = [];

    for (const url of urls) {
      void getStyleDocument(collabApiClient, url)
        .then((response) => {
          const objectUrl = createStyleImageObjectUrl(response);
          if (cancelled) {
            URL.revokeObjectURL(objectUrl);
            return;
          }

          objectUrls.push(objectUrl);
          setResolvedUrls((current) => ({ ...current, [url]: objectUrl }));
        })
        .catch((error) => {
          console.warn('Failed to load legend image', url, error);
        });
    }

    return () => {
      cancelled = true;
      objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
    };
  }, [imageUrlsKey]);

  return resolvedUrls;
}
