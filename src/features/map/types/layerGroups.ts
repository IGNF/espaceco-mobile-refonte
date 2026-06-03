export type LayerGroupId = 'signalements' | 'guichet' | 'mesCartes' | 'geoservices';
export type LayerGroupVisibility = Record<LayerGroupId, boolean>;

export interface LayerDirectContributionState {
  editable: boolean;
  locked: boolean;
  pendingChangesCount: number;
  isSubmitting: boolean;
}

export interface LayerStyleChoice {
  id: string;
  label: string;
}

export interface LayerGroupDirectContributionState {
  pendingChangesCount: number;
  isSubmitting: boolean;
}

export interface LayerGroupItem {
  id: string;
  title: string;
  layerKey?: string;
  visible?: boolean;
  opacity?: number;
  description?: string;
  removable?: boolean;
  directContribution?: LayerDirectContributionState;
  styleChoices?: LayerStyleChoice[];
  selectedStyleId?: string;
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

export interface LayerDisplayState {
  visibility: Record<string, boolean>;
  opacity: Record<string, number>;
}
