import { useMemo, useState } from 'react';
import type { CommunityLayer } from '@ign/mobile-core';
import type { LayerGroupId } from '@/features/map/types/layerGroups';
import { useLayerGroups } from '@/features/map/hooks/useLayerGroups';
import { LayersPanel } from '@/features/map/components/LayersPanel';
import { LayerGroupDetailsPage } from '@/features/map/pages/LayerGroupDetails/LayerGroupDetailsPage';

export interface LayersPanelFlowProps {
  isOpen: boolean;
  onClose: () => void;
  layers: CommunityLayer[];
  geoportailLayers: CommunityLayer[];
  vectorLayers: CommunityLayer[];
  isLoading: boolean;
  onSetLayerVisibility?: (layerKey: string, visible: boolean) => void;
}

export function LayersPanelFlow({
  isOpen,
  onClose,
  layers,
  geoportailLayers,
  vectorLayers,
  isLoading,
  onSetLayerVisibility,
}: LayersPanelFlowProps) {
  const { layerGroups, layerGroupSummaries } = useLayerGroups({
    layers,
    geoportailLayers,
    vectorLayers,
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
