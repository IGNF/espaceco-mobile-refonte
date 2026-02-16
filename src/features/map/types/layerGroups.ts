export type LayerGroupId = 'signalements' | 'guichet' | 'mesCartes' | 'geoservices';

export interface LayerGroupItem {
  id: string;
  title: string;
  layerKey?: string;
  visible?: boolean;
  opacity?: number;
  description?: string;
}

export interface LayerGroupSummary {
  id: LayerGroupId;
  title: string;
  count: number;
  visible: boolean;
  canToggle: boolean;
}

export interface LayerGroupDetails {
  id: LayerGroupId;
  title: string;
  items: LayerGroupItem[];
}
