import { useMemo, useState } from 'react';
import type { CommunityLayer } from '@ign/mobile-core';
import type { LayerGroupId, LayerGroupItem } from '@/features/map/types/layerGroups';
import { useLayerGroups } from '@/features/map/hooks/useLayerGroups';
import { LayersPanel } from '@/features/map/components/LayersPanel';
import { LayerGroupDetailsPage } from '@/features/map/pages/LayerGroupDetails/LayerGroupDetailsPage';
import type { SignalementLayerVisibility } from '@/features/map/types/signalementLayers';

export interface LayersPanelFlowProps {
  isOpen: boolean;
  onClose: () => void;
  layers: CommunityLayer[];
  geoportailLayers: CommunityLayer[];
  vectorLayers: CommunityLayer[];
  signalementLayerVisibility: SignalementLayerVisibility;
  isLoading: boolean;
  onSetLayerVisibility?: (layerKey: string, visible: boolean) => void;
}

export function LayersPanelFlow({
  isOpen,
  onClose,
  layers,
  geoportailLayers,
  vectorLayers,
  signalementLayerVisibility,
  isLoading,
  onSetLayerVisibility,
}: LayersPanelFlowProps) {
  const { layerGroups, layerGroupSummaries } = useLayerGroups({
    layers,
    geoportailLayers,
    vectorLayers,
    signalementLayerVisibility,
  });

  const [activeLayerGroup, setActiveLayerGroup] = useState<LayerGroupId | null>(null);
  const effectiveActiveLayerGroup = isOpen ? null : activeLayerGroup;

  const selectedLayerGroup = useMemo(
    () => layerGroups.find((group) => group.id === effectiveActiveLayerGroup) ?? null,
    [effectiveActiveLayerGroup, layerGroups]
  );

  const handleOpenLayerGroup = (groupId: LayerGroupId) => {
    onClose();
    setActiveLayerGroup(groupId);
  };

  const handleToggleGroupVisibility = (groupId: LayerGroupId) => {
    if (!onSetLayerVisibility) return;

    const group = layerGroups.find((candidate) => candidate.id === groupId);
    if (!group) return;

    const toggleableItems = group.items.filter(
      (item): item is LayerGroupItem & { layerKey: string } =>
        typeof item.layerKey === 'string' && item.layerKey.length > 0
    );
    if (toggleableItems.length === 0) return;

    const hasVisibleLayer = toggleableItems.some((item) => item.visible ?? true);
    const nextVisibility = !hasVisibleLayer;
    for (const item of toggleableItems) {
      onSetLayerVisibility(item.layerKey, nextVisibility);
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
        isOpen={isOpen}
        onClose={handleClosePanel}
        groups={layerGroupSummaries}
        isLoading={isLoading}
        onOpenGroup={handleOpenLayerGroup}
        onToggleGroupVisibility={handleToggleGroupVisibility}
      />
      <LayerGroupDetailsPage
        key={selectedLayerGroup?.id ?? 'no-layer-group'}
        isOpen={effectiveActiveLayerGroup !== null && selectedLayerGroup !== null}
        onClose={handleCloseLayerGroup}
        group={selectedLayerGroup}
        isLoading={isLoading}
        onSetLayerVisibility={onSetLayerVisibility}
      />
    </>
  );
}
