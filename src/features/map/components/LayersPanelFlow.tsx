import { useMemo, useState } from 'react';
import type { CommunityLayer } from '@ign/mobile-core';
import type { LayerGroupId } from '@/features/map/types/layerGroups';
import { useLayerGroups } from '@/features/map/hooks/useLayerGroups';
import { LayersPanel } from '@/features/map/components/LayersPanel';
import { LayerGroupDetailsPage } from '@/features/map/pages/LayerGroupDetails/LayerGroupDetailsPage';
import type {
  SignalementLayerKey,
  SignalementLayerOpacity,
  SignalementLayerVisibility
} from '@/features/map/types/signalementLayers';

export interface LayersPanelFlowProps {
  isOpen: boolean;
  onClose: () => void;
  layers: CommunityLayer[];
  geoportailLayers: CommunityLayer[];
  vectorLayers: CommunityLayer[];
  signalementLayerVisibility: SignalementLayerVisibility;
  signalementLayerOpacity: SignalementLayerOpacity;
  signalementLayerOrder: SignalementLayerKey[];
  pendingChangesCountByLayerKey?: Record<string, number>;
  isLoading: boolean;
  onSetLayerVisibility?: (layerKey: string, visible: boolean) => void;
  onSetLayerOpacity?: (layerKey: string, opacity: number) => void;
  onSetGroupLayerOrder?: (groupId: LayerGroupId, orderedLayerKeys: string[]) => void;
  onSendGroupDirectContributions?: (groupId: LayerGroupId) => void;
  onEditLayer?: (layerKey: string) => void;
  onSendLayerDirectContributions?: (layerKey: string) => void;
  onResetLayerDirectContributions?: (layerKey: string) => void;
  onToggleLayerDirectContributionLock?: (layerKey: string, locked: boolean) => void;
}

export function LayersPanelFlow({
  isOpen,
  onClose,
  layers,
  geoportailLayers,
  vectorLayers,
  signalementLayerVisibility,
  signalementLayerOpacity,
  signalementLayerOrder,
  pendingChangesCountByLayerKey,
  isLoading,
  onSetLayerVisibility,
  onSetLayerOpacity,
  onSetGroupLayerOrder,
  onSendGroupDirectContributions,
  onEditLayer,
  onSendLayerDirectContributions,
  onResetLayerDirectContributions,
  onToggleLayerDirectContributionLock,
}: LayersPanelFlowProps) {
  const { layerGroups, layerGroupSummaries } = useLayerGroups({
    layers,
    geoportailLayers,
    vectorLayers,
    signalementLayerVisibility,
    signalementLayerOpacity,
    signalementLayerOrder,
    pendingChangesCountByLayerKey,
  });

  const [activeLayerGroup, setActiveLayerGroup] = useState<LayerGroupId | null>(null);
  const isLayerGroupOpen = isOpen && activeLayerGroup !== null;
  const isPanelOpen = isOpen && !isLayerGroupOpen;

  const selectedLayerGroup = useMemo(
    () => layerGroups.find((group) => group.id === activeLayerGroup) ?? null,
    [activeLayerGroup, layerGroups]
  );

  const handleOpenLayerGroup = (groupId: LayerGroupId) => {
    setActiveLayerGroup(groupId);
  };

  const handleToggleGroupVisibility = (groupId: LayerGroupId) => {
    if (!onSetLayerVisibility) return;

    const group = layerGroups.find((candidate) => candidate.id === groupId);
    if (!group) return;

    const layerKeys: string[] = [];
    let hasVisibleLayer = false;

    for (const item of group.items) {
      if (!item.layerKey) continue;
      layerKeys.push(item.layerKey);
      if (item.visible ?? true) {
        hasVisibleLayer = true;
      }
    }

    if (layerKeys.length === 0) return;

    const nextVisibility = !hasVisibleLayer;
    for (const layerKey of layerKeys) {
      onSetLayerVisibility(layerKey, nextVisibility);
    }
  };

  const handleClosePanel = () => {
    onClose();
    setActiveLayerGroup(null);
  };

  const handleCloseLayerGroup = () => {
    setActiveLayerGroup(null);
  };

  return (
    <>
      <LayersPanel
        isOpen={isPanelOpen}
        onClose={handleClosePanel}
        groups={layerGroupSummaries}
        isLoading={isLoading}
        onOpenGroup={handleOpenLayerGroup}
        onToggleGroupVisibility={handleToggleGroupVisibility}
        onSendGroupDirectContributions={onSendGroupDirectContributions}
      />
      <LayerGroupDetailsPage
        isOpen={isLayerGroupOpen && selectedLayerGroup !== null}
        onClose={handleCloseLayerGroup}
        group={selectedLayerGroup}
        isLoading={isLoading}
        onSetLayerVisibility={onSetLayerVisibility}
        onSetLayerOpacity={onSetLayerOpacity}
        onSetGroupLayerOrder={onSetGroupLayerOrder}
        onEditLayer={onEditLayer}
        onSendLayerDirectContributions={onSendLayerDirectContributions}
        onResetLayerDirectContributions={onResetLayerDirectContributions}
        onToggleLayerDirectContributionLock={onToggleLayerDirectContributionLock}
      />
    </>
  );
}
