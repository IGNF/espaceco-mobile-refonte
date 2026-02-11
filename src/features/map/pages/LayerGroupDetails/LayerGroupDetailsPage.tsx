import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SlideUpPage } from '@/shared/ui/SlideUpPage';
import { PageHeader } from '@/shared/ui/PageHeader';
import type {
  LayerGroupDetails,
  LayerGroupItem,
} from '@/features/map/types/layerGroups';
import { Alert } from '@/shared/ui/Alert/Alert';

import screen from '@/shared/styles/screen.module.css';
import typography from '@/shared/styles/typography.module.css';
import styles from './LayerGroupDetailsPage.module.css';

import IconEye from '@/shared/assets/icons/icon-eye.svg?react';
import IconEyeOff from '@/shared/assets/icons/icon-access.svg?react';
import IconInfo from '@/shared/assets/icons/icon-info.svg?react';

export interface LayerGroupDetailsPageProps {
  isOpen: boolean;
  onClose: () => void;
  group: LayerGroupDetails | null;
  isLoading?: boolean;
  onSetLayerVisibility?: (layerKey: string, visible: boolean) => void;
}

export function LayerGroupDetailsPage({
  isOpen,
  onClose,
  group,
  isLoading = false,
  onSetLayerVisibility,
}: LayerGroupDetailsPageProps) {
  const { t } = useTranslation();
  const title = group?.title ?? t('layers.title');
  const [selectedItem, setSelectedItem] = useState<LayerGroupItem | null>(null);
  const infoDescription =
    typeof selectedItem?.description === 'string' && selectedItem.description.trim().length > 0
      ? selectedItem.description
      : t('layers.info.noDescription');

  const handleClose = () => {
    setSelectedItem(null);
    onClose();
  };

  const handleToggleVisibility = (item: LayerGroupItem) => {
    if (!item.layerKey || !onSetLayerVisibility) return;
    onSetLayerVisibility(item.layerKey, !(item.visible ?? true));
  };

  return (
    <>
      <SlideUpPage isOpen={isOpen} onClose={handleClose}>
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
              {group.items.map((item) => (
                <li key={item.id} className={styles.layerItem}>
                  <div className={styles.layerItemHeader}>
                    <button
                      type='button'
                      className={styles.layerActionButton}
                      onClick={() => handleToggleVisibility(item)}
                      disabled={!item.layerKey}
                      aria-label={
                        item.visible ?? true
                          ? t('layers.groupDetails.hideLayer')
                          : t('layers.groupDetails.showLayer')
                      }
                    >
                      {item.visible ?? true ? (
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
                </li>
              ))}
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
