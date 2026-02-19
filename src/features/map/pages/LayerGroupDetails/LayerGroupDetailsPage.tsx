import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import { SlideUpPage } from '@/shared/ui/SlideUpPage';
import { PageHeader } from '@/shared/ui/PageHeader';
import type {
  LayerGroupDetails,
  LayerGroupId,
  LayerGroupItem,
} from '@/features/map/types/layerGroups';
import { Alert } from '@/shared/ui/Alert/Alert';
import { Slider } from '@/shared/ui/Slider';
import { clampNumber } from '@/shared/utils/number';
import {
  areOrdersEqual,
  moveStringKey,
  orderItemsByStringKey,
} from '@/features/map/utils/order';

import screen from '@/shared/styles/screen.module.css';
import typography from '@/shared/styles/typography.module.css';
import styles from './LayerGroupDetailsPage.module.css';

import IconEye from '@/shared/assets/icons/icon-eye.svg?react';
import IconEyeOff from '@/shared/assets/icons/icon-access.svg?react';
import IconInfo from '@/shared/assets/icons/icon-info.svg?react';
import IconDragAndDrop from '@/shared/assets/icons/icon-drag\'n-drop.svg?react';

const LONG_PRESS_DURATION = 300;
const MOVE_CANCEL_THRESHOLD = 8;

interface LayerDraftState {
  visible: boolean;
  opacity: number;
}

type LayerDraftByKey = Record<string, LayerDraftState>;

interface PendingDragState {
  pointerId: number;
  itemId: string;
  startX: number;
  startY: number;
}

interface ActiveDragState {
  pointerId: number;
  itemId: string;
  startY: number;
}

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
}

export function LayerGroupDetailsPage({
  isOpen,
  onClose,
  group,
  isLoading = false,
  onSetLayerVisibility,
  onSetLayerOpacity,
  onSetGroupLayerOrder,
}: LayerGroupDetailsPageProps) {
  const { t } = useTranslation();
  const title = group?.title ?? t('layers.title');
  const [selectedItem, setSelectedItem] = useState<LayerGroupItem | null>(null);
  const [layerDraftByKey, setLayerDraftByKey] = useState<LayerDraftByKey>({});
  const [itemOrder, setItemOrder] = useState<string[]>([]);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);

  const itemRefs = useRef<Record<string, HTMLLIElement | null>>({});
  const pendingDragRef = useRef<PendingDragState | null>(null);
  const activeDragRef = useRef<ActiveDragState | null>(null);
  const holdTimerRef = useRef<number | null>(null);

  const infoDescription =
    typeof selectedItem?.description === 'string' && selectedItem.description.trim().length > 0
      ? selectedItem.description
      : t('layers.info.noDescription');

  const orderedItems = group
    ? orderItemsByStringKey(group.items, (item) => item.id, itemOrder)
    : [];

  const clearHoldTimer = useCallback(() => {
    if (holdTimerRef.current === null) return;

    window.clearTimeout(holdTimerRef.current);
    holdTimerRef.current = null;
  }, []);

  const clearDraggingState = useCallback(() => {
    clearHoldTimer();
    pendingDragRef.current = null;
    activeDragRef.current = null;
    setDraggingItemId(null);
    setDragOffsetY(0);
  }, [clearHoldTimer]);

  const getLayerDraftState = (item: LayerGroupItem): LayerDraftState => {
    if (!item.layerKey) {
      return getInitialLayerDraftState(item);
    }

    return layerDraftByKey[item.layerKey] ?? getInitialLayerDraftState(item);
  };

  const findTargetIndex = (
    itemId: string,
    clientY: number,
    currentItems: LayerGroupItem[]
  ): number => {
    let targetIndex = currentItems.length - 1;

    for (let index = 0; index < currentItems.length; index += 1) {
      const candidate = currentItems[index];

      if (candidate.id === itemId) {
        continue;
      }

      const item = itemRefs.current[candidate.id];
      if (!item) {
        continue;
      }

      const rect = item.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;

      if (clientY < midpoint) {
        targetIndex = index;
        break;
      }
    }

    return targetIndex;
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
    clearDraggingState();
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

  const handleDragHandlePointerDown = (
    item: LayerGroupItem,
    event: ReactPointerEvent<HTMLButtonElement>
  ) => {
    if (!onSetGroupLayerOrder || !item.layerKey || !event.isPrimary) {
      return;
    }

    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    const pointerId = event.pointerId;

    event.preventDefault();
    event.currentTarget.setPointerCapture(pointerId);

    clearHoldTimer();
    pendingDragRef.current = {
      pointerId,
      itemId: item.id,
      startX: event.clientX,
      startY: event.clientY,
    };

    holdTimerRef.current = window.setTimeout(() => {
      const pendingDrag = pendingDragRef.current;

      if (
        !pendingDrag ||
        pendingDrag.pointerId !== pointerId ||
        pendingDrag.itemId !== item.id
      ) {
        return;
      }

      pendingDragRef.current = null;
      activeDragRef.current = {
        pointerId,
        itemId: item.id,
        startY: pendingDrag.startY,
      };

      const currentOrder = orderedItems.map((orderedItem) => orderedItem.id);
      setItemOrder(currentOrder);
      setDraggingItemId(item.id);
      setDragOffsetY(0);
    }, LONG_PRESS_DURATION);
  };

  const handleDragHandlePointerMove = (
    event: ReactPointerEvent<HTMLButtonElement>
  ) => {
    const pendingDrag = pendingDragRef.current;
    if (pendingDrag && pendingDrag.pointerId === event.pointerId) {
      const deltaX = event.clientX - pendingDrag.startX;
      const deltaY = event.clientY - pendingDrag.startY;

      if (Math.hypot(deltaX, deltaY) > MOVE_CANCEL_THRESHOLD) {
        clearHoldTimer();
        pendingDragRef.current = null;
      }

      return;
    }

    const activeDrag = activeDragRef.current;
    if (!activeDrag || activeDrag.pointerId !== event.pointerId || !group) {
      return;
    }

    event.preventDefault();
    setDragOffsetY(event.clientY - activeDrag.startY);

    setItemOrder((currentItemOrder) => {
      const currentItems = orderItemsByStringKey(
        group.items,
        (item) => item.id,
        currentItemOrder
      );
      const targetIndex = findTargetIndex(activeDrag.itemId, event.clientY, currentItems);
      return moveStringKey(currentItemOrder, activeDrag.itemId, targetIndex);
    });
  };

  const handleDragHandlePointerEnd = (
    event: ReactPointerEvent<HTMLButtonElement>
  ) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const isPendingPointer = pendingDragRef.current?.pointerId === event.pointerId;
    const isActivePointer = activeDragRef.current?.pointerId === event.pointerId;

    if (!isPendingPointer && !isActivePointer) {
      return;
    }

    clearDraggingState();
  };

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

  useEffect(() => {
    if (isOpen) {
      return;
    }

    const timer = window.setTimeout(() => {
      clearDraggingState();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [clearDraggingState, isOpen]);

  useEffect(() => {
    return () => {
      clearHoldTimer();
    };
  }, [clearHoldTimer]);

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
            <ul className={styles.layerList}>
              {orderedItems.map((item) => {
                const draftState = getLayerDraftState(item);
                const isDragging = draggingItemId === item.id;
                const layerItemClasses = [
                  styles.layerItem,
                  isDragging ? styles.layerItemDragging : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <li
                    key={item.id}
                    className={layerItemClasses}
                    style={isDragging ? { transform: `translateY(${dragOffsetY}px)` } : undefined}
                    ref={(element) => {
                      itemRefs.current[item.id] = element;
                    }}
                  >
                    <div className={styles.layerItemHeader}>
                      <button
                        type='button'
                        className={styles.layerActionButton}
                        onClick={() => handleToggleVisibility(item)}
                        disabled={!item.layerKey}
                        aria-label={
                          draftState.visible
                            ? t('layers.groupDetails.hideLayer')
                            : t('layers.groupDetails.showLayer')
                        }
                      >
                        {draftState.visible ? (
                          <IconEye className={styles.layerItemIcon} />
                        ) : (
                          <IconEyeOff className={styles.layerItemIcon} />
                        )}
                      </button>
                      <span className={styles.layerItemTitle}>{item.title}</span>
                      <button
                        type='button'
                        className={styles.layerActionButton}
                        onClick={() => setSelectedItem(item)}
                        aria-label={t('layers.groupDetails.layerInfo')}
                      >
                        <IconInfo className={styles.layerActionIcon} />
                      </button>
                      <button
                        type='button'
                        className={styles.layerDragHandle}
                        onPointerDown={(event) => handleDragHandlePointerDown(item, event)}
                        onPointerMove={handleDragHandlePointerMove}
                        onPointerUp={handleDragHandlePointerEnd}
                        onPointerCancel={handleDragHandlePointerEnd}
                        aria-label={`${t('layers.groupDetails.reorderLayer')}: ${item.title}`}
                        disabled={!item.layerKey || !onSetGroupLayerOrder}
                      >
                        <IconDragAndDrop className={styles.layerDragHandleIcon} />
                      </button>
                    </div>
                    <Slider
                      value={draftState.opacity}
                      min={0}
                      max={1}
                      step={0.01}
                      disabled={!item.layerKey}
                      className={styles.layerSlider}
                      ariaLabel={t('layers.groupDetails.layerOpacity')}
                      onChange={(opacity) => handleSetOpacity(item, opacity)}
                    />
                  </li>
                );
              })}
            </ul>
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
