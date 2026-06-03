import { useSortable } from '@dnd-kit/react/sortable';
import { joinCSSClassNames } from '@/shared/utils/join';
import { Loading } from '@/shared/ui/Loading/Loading';
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
import IconEdit from '@/shared/assets/icons/icon-edit.svg?react';
import IconSend from '@/shared/assets/icons/icon-send.svg?react';
import IconReset from '@/shared/assets/icons/icon-reset.svg?react';
import IconLock from '@/shared/assets/icons/icon-lock.svg?react';
import IconFormatting from '@/shared/assets/icons/icon-formatting.svg?react';
import IconDelete from '@/shared/assets/icons/icon-delete.svg?react';

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
  editLayerLabel: string;
  selectLayerStyleLabel: string;
  sendLayerChangesLabel: string;
  resetLayerChangesLabel: string;
  lockLayerLabel: string;
  unlockLayerLabel: string;
  deleteLayerLabel: string;
  onToggleVisibility: () => void;
  onShowInfo: () => void;
  onSetOpacity: (opacity: number) => void;
  onDeleteLayer?: () => void;
  onEditLayer?: () => void;
  onSelectLayerStyle?: () => void;
  onSendLayerChanges?: () => void;
  onResetLayerChanges?: () => void;
  onToggleLayerLock?: (locked: boolean) => void;
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
  editLayerLabel,
  selectLayerStyleLabel,
  sendLayerChangesLabel,
  resetLayerChangesLabel,
  lockLayerLabel,
  unlockLayerLabel,
  deleteLayerLabel,
  onToggleVisibility,
  onShowInfo,
  onSetOpacity,
  onDeleteLayer,
  onEditLayer,
  onSelectLayerStyle,
  onSendLayerChanges,
  onResetLayerChanges,
  onToggleLayerLock,
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
  const directContribution = item.directContribution;
  const isSubmittingDirectContribution = directContribution?.isSubmitting === true;
  const canEditDirectContribution = Boolean(
    directContribution &&
      directContribution.editable &&
      !directContribution.locked &&
      !directContribution.isSubmitting &&
      onEditLayer
  );
  const canSendDirectContribution = Boolean(
    directContribution &&
      directContribution.editable &&
      !directContribution.locked &&
      !directContribution.isSubmitting &&
      directContribution.pendingChangesCount > 0 &&
      onSendLayerChanges
  );
  const canResetDirectContribution = Boolean(
    directContribution &&
      directContribution.editable &&
      !directContribution.locked &&
      !directContribution.isSubmitting &&
      directContribution.pendingChangesCount > 0 &&
      onResetLayerChanges
  );
  const canToggleDirectContributionLock = Boolean(
    directContribution &&
      directContribution.editable &&
      !directContribution.isSubmitting &&
      onToggleLayerLock
  );
  const isInteractionDisabled = isSubmittingDirectContribution;
  const hasStyleChoices = (item.styleChoices?.length ?? 0) > 0;
  const canSelectLayerStyle = hasStyleChoices && onSelectLayerStyle !== undefined && !isInteractionDisabled;

  return (
    <li ref={ref} className={layerItemClasses}>
      <div className={styles.layerItemHeader}>
        <button
          type='button'
          className={styles.layerVisibilityButton}
          onClick={onToggleVisibility}
          disabled={!item.layerKey || isInteractionDisabled}
          aria-label={visible ? hideLayerLabel : showLayerLabel}
        >
          {visible ? (
            <IconEye className={styles.layerItemIcon} />
          ) : (
            <IconEyeOff className={styles.layerItemIcon} />
          )}
        </button>
        <span className={styles.layerItemTitle}>{item.title}</span>
      </div>

      <div className={styles.layerActionRow}>
        {directContribution && (
          <>
            <button
              type='button'
              className={styles.layerActionButton}
              onClick={onEditLayer}
              disabled={!canEditDirectContribution}
              aria-label={editLayerLabel}
            >
              <IconEdit className={styles.layerActionIcon} />
            </button>
            <button
              type='button'
              className={styles.layerActionButton}
              onClick={onSendLayerChanges}
              disabled={!canSendDirectContribution}
              aria-label={sendLayerChangesLabel}
            >
              {isSubmittingDirectContribution ? (
                <Loading size='small' className={styles.layerActionLoading} />
              ) : (
                <IconSend className={styles.layerActionIcon} />
              )}
              {directContribution.pendingChangesCount > 0 && (
                <span className={styles.layerActionBadge}>
                  {directContribution.pendingChangesCount}
                </span>
              )}
            </button>
            <button
              type='button'
              className={styles.layerActionButton}
              onClick={onResetLayerChanges}
              disabled={!canResetDirectContribution}
              aria-label={resetLayerChangesLabel}
            >
              <IconReset className={styles.layerActionIcon} />
            </button>
            <button
              type='button'
              className={joinCSSClassNames(
                styles.layerActionButton,
                !directContribution.locked && styles.layerActionButtonActive
              )}
              onClick={() => onToggleLayerLock?.(!directContribution.locked)}
              disabled={!canToggleDirectContributionLock}
              aria-label={
                directContribution.locked ? unlockLayerLabel : lockLayerLabel
              }
              aria-pressed={!directContribution.locked}
            >
              <IconLock className={styles.layerActionIcon} />
            </button>
          </>
        )}
        {hasStyleChoices && (
          <button
            type='button'
            className={styles.layerActionButton}
            onClick={onSelectLayerStyle}
            disabled={!canSelectLayerStyle}
            aria-label={selectLayerStyleLabel}
          >
            <IconFormatting className={styles.layerActionIcon} />
          </button>
        )}
        <button
          type='button'
          className={styles.layerActionButton}
          onClick={onShowInfo}
          aria-label={layerInfoLabel}
          disabled={isInteractionDisabled}
        >
          <IconInfo className={styles.layerActionIcon} />
        </button>
        {item.removable && (
          <button
            type='button'
            className={styles.layerActionButton}
            onClick={onDeleteLayer}
            aria-label={deleteLayerLabel}
            disabled={!onDeleteLayer || isInteractionDisabled}
          >
            <IconDelete className={styles.layerActionIcon} />
          </button>
        )}
        <button
          ref={handleRef}
          type='button'
          className={styles.layerDragHandle}
          onContextMenu={(event) => event.preventDefault()}
          aria-label={reorderLayerLabel}
          disabled={!canReorder || isInteractionDisabled}
        >
          <IconDragAndDrop className={styles.layerDragHandleIcon} />
        </button>
      </div>
      <Slider
        value={opacity}
        min={0}
        max={1}
        step={0.01}
        disabled={!item.layerKey || isInteractionDisabled}
        className={styles.layerSlider}
        ariaLabel={layerOpacityLabel}
        onChange={onSetOpacity}
      />
    </li>
  );
}
