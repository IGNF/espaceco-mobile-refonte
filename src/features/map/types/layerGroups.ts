export type LayerGroupId = 'signalements' | 'guichet' | 'mesCartes' | 'geoservices';

export interface LayerDirectContributionState {
  editable: boolean;
  locked: boolean;
  pendingChangesCount: number;
}

export interface LayerGroupDirectContributionState {
  pendingChangesCount: number;
}

export interface LayerGroupItem {
  id: string;
  title: string;
  layerKey?: string;
  visible?: boolean;
  opacity?: number;
  description?: string;
  directContribution?: LayerDirectContributionState;
}

export interface LayerGroupSummary {
  id: LayerGroupId;
  title: string;
  count: number;
  visible: boolean;
  canToggle: boolean;
  directContribution?: LayerGroupDirectContributionState;
}

export interface LayerGroupDetails {
  id: LayerGroupId;
  title: string;
  items: LayerGroupItem[];
}
