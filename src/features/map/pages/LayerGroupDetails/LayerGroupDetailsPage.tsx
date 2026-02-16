import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SlideUpPage } from '@/shared/ui/SlideUpPage';
import { PageHeader } from '@/shared/ui/PageHeader';
import type {
  LayerGroupDetails,
  LayerGroupItem,
} from '@/features/map/types/layerGroups';
import { Alert } from '@/shared/ui/Alert/Alert';
import { Slider } from '@/shared/ui/Slider';
import { clampNumber } from '@/shared/utils/number';

import screen from '@/shared/styles/screen.module.css';
import typography from '@/shared/styles/typography.module.css';
import styles from './LayerGroupDetailsPage.module.css';

import IconEye from '@/shared/assets/icons/icon-eye.svg?react';
import IconEyeOff from '@/shared/assets/icons/icon-access.svg?react';
import IconInfo from '@/shared/assets/icons/icon-info.svg?react';

interface LayerDraftState {
  visible: boolean;
  opacity: number;
}

type LayerDraftByKey = Record<string, LayerDraftState>;

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
}

export function LayerGroupDetailsPage({
  isOpen,
  onClose,
  group,
  isLoading = false,
  onSetLayerVisibility,
  onSetLayerOpacity,
}: LayerGroupDetailsPageProps) {
  const { t } = useTranslation();
  const title = group?.title ?? t('layers.title');
  const [selectedItem, setSelectedItem] = useState<LayerGroupItem | null>(null);
  const [layerDraftByKey, setLayerDraftByKey] = useState<LayerDraftByKey>({});
  const infoDescription =
    typeof selectedItem?.description === 'string' && selectedItem.description.trim().length > 0
      ? selectedItem.description
      : t('layers.info.noDescription');

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

  const handleClose = () => {
    applyDraftChanges();
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
          ) : !group || group.items.length === 0 ? (
            <p className={styles.empty}>{t('layers.groupDetails.empty')}</p>
          ) : (
            <ul className={styles.layerList}>
              {group.items.map((item) => {
                const draftState = getLayerDraftState(item);

                return (
                  <li key={item.id} className={styles.layerItem}>
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
