import { useCallback, useEffect, useState } from 'react';
import { DragDropProvider } from '@dnd-kit/react';
import { useTranslation } from 'react-i18next';
import { SlideUpPage } from '@/shared/ui/SlideUpPage';
import { PageHeader } from '@/shared/ui/PageHeader';
import type {
  LayerGroupDetails,
  LayerGroupId,
  LayerGroupItem,
} from '@/features/map/types/layerGroups';
import { Alert } from '@/shared/ui/Alert/Alert';
import { clampNumber } from '@/shared/utils/number';
import {
  areOrdersEqual,
  moveStringKey,
  orderItemsByStringKey,
} from '@/features/map/utils/order';
import { LayerGroupDetailsSortableItem } from '@/features/map/components/LayerGroupDetailsSortableItem';

import screen from '@/shared/styles/screen.module.css';
import typography from '@/shared/styles/typography.module.css';
import styles from './LayerGroupDetailsPage.module.css';

interface LayerDraftState {
  visible: boolean;
  opacity: number;
}

type LayerDraftByKey = Record<string, LayerDraftState>;

function getLayerKeys(items: LayerGroupItem[]): string[] {
  const layerKeys: string[] = [];

  for (const item of items) {
    if (typeof item.layerKey === 'string' && item.layerKey.length > 0) {
      layerKeys.push(item.layerKey);
    }
  }

  return layerKeys;
}

function getInitialLayerDraftState(item: LayerGroupItem): LayerDraftState {
  return {
    visible: item.visible ?? true,
    opacity: clampNumber(item.opacity ?? 1, 0, 1),
  };
}

export interface LayerGroupDetailsPageProps {
  isOpen: boolean;
  onClose: () => void;
  group: LayerGroupDetails | null;
  isLoading?: boolean;
  onSetLayerVisibility?: (layerKey: string, visible: boolean) => void;
  onSetLayerOpacity?: (layerKey: string, opacity: number) => void;
  onSetGroupLayerOrder?: (groupId: LayerGroupId, orderedLayerKeys: string[]) => void;
  onEditLayer?: (layerKey: string) => void;
  onSendLayerDirectContributions?: (layerKey: string) => void;
  onResetLayerDirectContributions?: (layerKey: string) => void;
  onToggleLayerDirectContributionLock?: (layerKey: string, locked: boolean) => void;
}

export function LayerGroupDetailsPage({
  isOpen,
  onClose,
  group,
  isLoading = false,
  onSetLayerVisibility,
  onSetLayerOpacity,
  onSetGroupLayerOrder,
  onEditLayer,
  onSendLayerDirectContributions,
  onResetLayerDirectContributions,
  onToggleLayerDirectContributionLock,
}: LayerGroupDetailsPageProps) {
  const { t } = useTranslation();
  const title = group?.title ?? t('layers.title');
  const [selectedItem, setSelectedItem] = useState<LayerGroupItem | null>(null);
  const [layerDraftByKey, setLayerDraftByKey] = useState<LayerDraftByKey>({});
  const [itemOrder, setItemOrder] = useState<string[]>([]);

  const infoDescription =
    typeof selectedItem?.description === 'string' && selectedItem.description.trim().length > 0
      ? selectedItem.description
      : t('layers.info.noDescription');
  const showLayerLabel = t('layers.groupDetails.showLayer');
  const hideLayerLabel = t('layers.groupDetails.hideLayer');
  const layerInfoLabel = t('layers.groupDetails.layerInfo');
  const layerOpacityLabel = t('layers.groupDetails.layerOpacity');
  const reorderLayerLabel = t('layers.groupDetails.reorderLayer');
  const editLayerLabel = t('layers.groupDetails.editLayer');
  const sendLayerChangesLabel = t('layers.groupDetails.sendLayerChanges');
  const resetLayerChangesLabel = t('layers.groupDetails.resetLayerChanges');
  const lockLayerLabel = t('layers.groupDetails.lockLayerEdition');
  const unlockLayerLabel = t('layers.groupDetails.unlockLayerEdition');

  const orderedItems = group
    ? orderItemsByStringKey(group.items, (item) => item.id, itemOrder)
    : [];

  const getLayerDraftState = (item: LayerGroupItem): LayerDraftState => {
    if (!item.layerKey) {
      return getInitialLayerDraftState(item);
    }

    return layerDraftByKey[item.layerKey] ?? getInitialLayerDraftState(item);
  };

  const applyDraftChanges = () => {
    if (!group) return;

    for (const item of group.items) {
      const layerKey = item.layerKey;
      if (!layerKey) continue;

      const draftState = layerDraftByKey[layerKey];
      if (!draftState) continue;

      const originalState = getInitialLayerDraftState(item);

      if (onSetLayerVisibility && draftState.visible !== originalState.visible) {
        onSetLayerVisibility(layerKey, draftState.visible);
      }

      if (onSetLayerOpacity && Math.abs(draftState.opacity - originalState.opacity) > 0.001) {
        onSetLayerOpacity(layerKey, draftState.opacity);
      }
    }
  };

  const applyLayerOrderChanges = () => {
    if (!group || !onSetGroupLayerOrder) {
      return;
    }

    const nextOrderedItems = orderItemsByStringKey(
      group.items,
      (item) => item.id,
      itemOrder
    );
    const nextOrderedLayerKeys = getLayerKeys(nextOrderedItems);
    const currentLayerKeys = getLayerKeys(group.items);

    if (areOrdersEqual(nextOrderedLayerKeys, currentLayerKeys)) {
      return;
    }

    onSetGroupLayerOrder(group.id, nextOrderedLayerKeys);
  };

  const handleClose = () => {
    applyDraftChanges();
    applyLayerOrderChanges();
    setLayerDraftByKey({});
    setSelectedItem(null);
    onClose();
  };

  const updateLayerDraft = (
    item: LayerGroupItem,
    update: (state: LayerDraftState) => LayerDraftState
  ) => {
    if (!item.layerKey) return;
    const layerKey = item.layerKey;

    setLayerDraftByKey((current) => {
      const previousState = current[layerKey] ?? getInitialLayerDraftState(item);

      return {
        ...current,
        [layerKey]: update(previousState),
      };
    });
  };

  const handleToggleVisibility = (item: LayerGroupItem) => {
    updateLayerDraft(item, (previousState) => ({
      ...previousState,
      visible: !previousState.visible,
    }));
  };

  const handleSetOpacity = (item: LayerGroupItem, opacity: number) => {
    const nextOpacity = clampNumber(opacity, 0, 1);
    updateLayerDraft(item, (previousState) => ({
      ...previousState,
      opacity: nextOpacity,
    }));
  };

  const reorderFromIds = useCallback((
    sourceId: string | number | null | undefined,
    targetId: string | number | null | undefined
  ) => {
    if (!onSetGroupLayerOrder || sourceId == null || targetId == null) {
      return;
    }

    setItemOrder((currentItemOrder) => {
      const sourceLayerId = String(sourceId);
      const sourceIndex = currentItemOrder.indexOf(sourceLayerId);
      if (sourceIndex < 0) {
        return currentItemOrder;
      }

      const targetLayerId = String(targetId);
      const targetIndex = currentItemOrder.indexOf(targetLayerId);

      if (targetIndex < 0 || sourceIndex === targetIndex) {
        return currentItemOrder;
      }

      return moveStringKey(currentItemOrder, sourceLayerId, targetIndex);
    });
  }, [onSetGroupLayerOrder]);

  useEffect(() => {
    const nextItemOrder = group?.items.map((item) => item.id) ?? [];

    const timer = window.setTimeout(() => {
      setItemOrder((currentItemOrder) =>
        areOrdersEqual(currentItemOrder, nextItemOrder)
          ? currentItemOrder
          : nextItemOrder
      );
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [group]);

  return (
    <>
      <SlideUpPage isOpen={isOpen} onClose={handleClose} level={2}>
        <PageHeader
          title={title}
          showBackButton
          showCloseButton={false}
          onBack={handleClose}
        />

        <main className={`${screen.screenContainer} ${styles.content}`}>
          <div className={styles.titleSection}>
            <h1 className={typography.title}>{title}</h1>
            <p className={typography.subtitle}>{t('layers.groupDetails.subtitle')}</p>
          </div>

          {isLoading ? (
            <p className={styles.loading}>{t('layers.groupDetails.loading')}</p>
          ) : !group || orderedItems.length === 0 ? (
            <p className={styles.empty}>{t('layers.groupDetails.empty')}</p>
          ) : (
            <DragDropProvider
              onDragOver={(event) =>
                reorderFromIds(event.operation.source?.id, event.operation.target?.id)
              }
              onDragEnd={(event) =>
                reorderFromIds(event.operation.source?.id, event.operation.target?.id)
              }
            >
              <ul className={styles.layerList}>
                {orderedItems.map((item, index) => {
                  const draftState = getLayerDraftState(item);
                  const canReorder = Boolean(item.layerKey && onSetGroupLayerOrder);
                  const layerKey = item.layerKey;

                  return (
                    <LayerGroupDetailsSortableItem
                      key={item.id}
                      item={item}
                      index={index}
                      groupId={group.id}
                      canReorder={canReorder}
                      visible={draftState.visible}
                      opacity={draftState.opacity}
                      showLayerLabel={showLayerLabel}
                      hideLayerLabel={hideLayerLabel}
                      layerInfoLabel={layerInfoLabel}
                      layerOpacityLabel={layerOpacityLabel}
                      reorderLayerLabel={`${reorderLayerLabel}: ${item.title}`}
                      editLayerLabel={`${editLayerLabel}: ${item.title}`}
                      sendLayerChangesLabel={`${sendLayerChangesLabel}: ${item.title}`}
                      resetLayerChangesLabel={`${resetLayerChangesLabel}: ${item.title}`}
                      lockLayerLabel={`${lockLayerLabel}: ${item.title}`}
                      unlockLayerLabel={`${unlockLayerLabel}: ${item.title}`}
                      onToggleVisibility={() => handleToggleVisibility(item)}
                      onShowInfo={() => setSelectedItem(item)}
                      onSetOpacity={(opacity) => handleSetOpacity(item, opacity)}
                      onEditLayer={
                        layerKey && onEditLayer
                          ? () => onEditLayer(layerKey)
                          : undefined
                      }
                      onSendLayerChanges={
                        layerKey && onSendLayerDirectContributions
                          ? () => onSendLayerDirectContributions(layerKey)
                          : undefined
                      }
                      onResetLayerChanges={
                        layerKey && onResetLayerDirectContributions
                          ? () => onResetLayerDirectContributions(layerKey)
                          : undefined
                      }
                      onToggleLayerLock={
                        layerKey && onToggleLayerDirectContributionLock
                          ? (locked) => onToggleLayerDirectContributionLock(layerKey, locked)
                          : undefined
                      }
                    />
                  );
                })}
              </ul>
            </DragDropProvider>
          )}
        </main>
      </SlideUpPage>

      <Alert
        isOpen={isOpen && selectedItem !== null}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.title ?? t('layers.info.untitled')}
        subtitle={infoDescription}
      />
    </>
  );
}
