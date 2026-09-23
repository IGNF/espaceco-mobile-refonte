import type { CommunityLayer, StyleRule } from '@ign/mobile-core';

import { getCommunityLayerTitle } from '@/shared/utils/communityLayer';
import { getCommunityLayerKey } from '@/shared/utils/layerKey';

export interface CommunityLayerLegendItem {
  label: string;
  color?: string;
  imageUrl?: string;
}

export interface CommunityLayerLegend {
  layerKey: string;
  title: string;
  color?: string;
  imageUrl?: string;
  items: CommunityLayerLegendItem[];
}

function toCssColor(value: string | number[] | undefined): string | undefined {
  if (typeof value === 'string') {
    return value;
  }

  if (!value) {
    return undefined;
  }

  const [red, green, blue, alpha] = value;
  return alpha === undefined
    ? `rgb(${red}, ${green}, ${blue})`
    : `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function getRuleColor(rule: StyleRule): string | undefined {
  return toCssColor(rule.fillColor) ?? toCssColor(rule.color) ?? toCssColor(rule.strokeColor);
}

function getRuleImageUrl(rule: StyleRule): string | undefined {
  return typeof rule.uri === 'string' && /^https?:\/\//i.test(rule.uri) ? rule.uri : undefined;
}

function toLegendItem(rule: StyleRule): CommunityLayerLegendItem | undefined {
  const label = rule.name?.trim();
  if (!label) {
    return undefined;
  }

  return {
    label,
    color: getRuleColor(rule),
    imageUrl: getRuleImageUrl(rule),
  };
}

export function getCommunityLayerLegends(layers: CommunityLayer[]): CommunityLayerLegend[] {
  const legends: CommunityLayerLegend[] = [];

  for (const layer of layers) {
    const style = layer.table?.style;
    if (!style) {
      continue;
    }

    const items = (style.children ?? []).flatMap((rule) => {
      const item = toLegendItem(rule);
      return item ? [item] : [];
    });
    const rule = style as StyleRule;
    const color = getRuleColor(rule);
    const imageUrl = getRuleImageUrl(rule);
    const layerKey = getCommunityLayerKey(layer);
    const title = getCommunityLayerTitle(layer);

    if (items.length === 0) {
      if (!color && !imageUrl) {
        continue;
      }

      legends.push({ layerKey, title, color, imageUrl, items });
      continue;
    }

    legends.push({ layerKey, title, items });
  }

  return legends;
}
