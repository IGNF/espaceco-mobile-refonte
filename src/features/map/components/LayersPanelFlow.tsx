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
} from '@/features/map/constants/signalementLayers.constants';

export interface LayersPanelFlowProps {
  isOpen: boolean;
  onClose: () => void;
  initialLayerGroupId?: LayerGroupId | null;
  initialLayerGroupRequestKey?: number;
  layers: CommunityLayer[];
  geoportailLayers: CommunityLayer[];
  vectorLayers: CommunityLayer[];
  signalementLayerVisibility: SignalementLayerVisibility;
  signalementLayerOpacity: SignalementLayerOpacity;
  signalementLayerOrder: SignalementLayerKey[];
  pendingChangesCountByLayerKey?: Record<string, number>;
  lockedByLayerKey?: Record<string, boolean>;
  submittingByLayerKey?: Record<string, boolean>;
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
  initialLayerGroupId = null,
  initialLayerGroupRequestKey = 0,
  layers,
  geoportailLayers,
  vectorLayers,
  signalementLayerVisibility,
  signalementLayerOpacity,
  signalementLayerOrder,
  pendingChangesCountByLayerKey,
  lockedByLayerKey,
  submittingByLayerKey,
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
    lockedByLayerKey,
    submittingByLayerKey,
  });

  const [activeLayerGroupState, setActiveLayerGroupState] = useState<LayerGroupId | null>(null);
  const [
    dismissedInitialLayerGroupRequestKey,
    setDismissedInitialLayerGroupRequestKey,
  ] = useState<number | null>(null);
  const activeInitialLayerGroup =
    isOpen &&
    initialLayerGroupId !== null &&
    dismissedInitialLayerGroupRequestKey !== initialLayerGroupRequestKey
      ? initialLayerGroupId
      : null;
  const activeLayerGroup = activeInitialLayerGroup ?? activeLayerGroupState;
  const isLayerGroupOpen = isOpen && activeLayerGroup !== null;
  const isPanelOpen = isOpen && !isLayerGroupOpen;

  const selectedLayerGroup = useMemo(
    () => layerGroups.find((group) => group.id === activeLayerGroup) ?? null,
    [activeLayerGroup, layerGroups]
  );

  const handleOpenLayerGroup = (groupId: LayerGroupId) => {
    setDismissedInitialLayerGroupRequestKey(initialLayerGroupRequestKey);
    setActiveLayerGroupState(groupId);
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
    setDismissedInitialLayerGroupRequestKey(initialLayerGroupRequestKey);
    setActiveLayerGroupState(null);
  };

  const handleCloseLayerGroup = () => {
    setDismissedInitialLayerGroupRequestKey(initialLayerGroupRequestKey);
    setActiveLayerGroupState(null);

    if (activeInitialLayerGroup !== null) {
      onClose();
    }
  };

  const handleSendGroupDirectContributions = (groupId: LayerGroupId) => {
    // If the parent has a dedicated group level implementation to send direct contributions, prefer it
    if (onSendGroupDirectContributions) {
      onSendGroupDirectContributions(groupId)
      return
    }

    // Otherwise, fall back to the per layer action by submitting each eligible layer
    if (!onSendLayerDirectContributions) {
      return
    }

    const group = layerGroups.find((candidate) => candidate.id === groupId)
    if (!group) {
      return
    }

    const isSubmittingDirectContribution = group.items.some(
      (item) => item.directContribution?.isSubmitting === true
    )
    if (isSubmittingDirectContribution) {
      return
    }

    // filter layers that can submit direct contributions *and* have pending changes
    const layerKeys = group.items
      .filter((item) =>
        item.layerKey &&
        item.directContribution &&
        item.directContribution.editable &&
        !item.directContribution.locked &&
        item.directContribution.pendingChangesCount > 0
      )
      .map((item) => item.layerKey as string)

    void (async () => {
      // submit sequentially the pending changes for each layer
      for (const layerKey of layerKeys) {
        await Promise.resolve(onSendLayerDirectContributions(layerKey))
      }
    })()
  }

  return (
    <>
      <LayersPanel
        isOpen={isPanelOpen}
        onClose={handleClosePanel}
        groups={layerGroupSummaries}
        isLoading={isLoading}
        onOpenGroup={handleOpenLayerGroup}
        onToggleGroupVisibility={handleToggleGroupVisibility}
        onSendGroupDirectContributions={handleSendGroupDirectContributions}
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
