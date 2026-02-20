import { useSortable } from '@dnd-kit/react/sortable';
import type {
  LayerGroupId,
  LayerGroupItem,
} from '@/features/map/types/layerGroups';
import { Slider } from '@/shared/ui/Slider';

import styles from './LayerGroupDetailsSortableItem.module.css';

import IconEye from '@/shared/assets/icons/icon-eye.svg?react';
import IconEyeOff from '@/shared/assets/icons/icon-access.svg?react';
import IconInfo from '@/shared/assets/icons/icon-info.svg?react';
import IconDragAndDrop from '@/shared/assets/icons/icon-drag\'n-drop.svg?react';

export interface LayerGroupDetailsSortableItemProps {
  item: LayerGroupItem;
  index: number;
  groupId: LayerGroupId;
  canReorder: boolean;
  visible: boolean;
  opacity: number;
  showLayerLabel: string;
  hideLayerLabel: string;
  layerInfoLabel: string;
  layerOpacityLabel: string;
  reorderLayerLabel: string;
  onToggleVisibility: () => void;
  onShowInfo: () => void;
  onSetOpacity: (opacity: number) => void;
}

export function LayerGroupDetailsSortableItem({
  item,
  index,
  groupId,
  canReorder,
  visible,
  opacity,
  showLayerLabel,
  hideLayerLabel,
  layerInfoLabel,
  layerOpacityLabel,
  reorderLayerLabel,
  onToggleVisibility,
  onShowInfo,
  onSetOpacity,
}: LayerGroupDetailsSortableItemProps) {
  const { ref, handleRef, isDragSource } = useSortable({
    id: item.id,
    index,
    group: groupId,
    disabled: !canReorder,
  });

  const layerItemClasses = [
    styles.layerItem,
    isDragSource ? styles.layerItemDragging : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <li ref={ref} className={layerItemClasses}>
      <div className={styles.layerItemHeader}>
        <button
          type='button'
          className={styles.layerActionButton}
          onClick={onToggleVisibility}
          disabled={!item.layerKey}
          aria-label={visible ? hideLayerLabel : showLayerLabel}
        >
          {visible ? (
            <IconEye className={styles.layerItemIcon} />
          ) : (
            <IconEyeOff className={styles.layerItemIcon} />
          )}
        </button>
        <span className={styles.layerItemTitle}>{item.title}</span>
        <button
          type='button'
          className={styles.layerActionButton}
          onClick={onShowInfo}
          aria-label={layerInfoLabel}
        >
          <IconInfo className={styles.layerActionIcon} />
        </button>
        <button
          ref={handleRef}
          type='button'
          className={styles.layerDragHandle}
          onContextMenu={(event) => event.preventDefault()}
          aria-label={reorderLayerLabel}
          disabled={!canReorder}
        >
          <IconDragAndDrop className={styles.layerDragHandleIcon} />
        </button>
      </div>
      <Slider
        value={opacity}
        min={0}
        max={1}
        step={0.01}
        disabled={!item.layerKey}
        className={styles.layerSlider}
        ariaLabel={layerOpacityLabel}
        onChange={onSetOpacity}
      />
    </li>
  );
}
