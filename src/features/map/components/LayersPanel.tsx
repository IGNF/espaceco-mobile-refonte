import { useTranslation } from 'react-i18next';
import { SlideUpPage } from '@/shared/ui/SlideUpPage';
import type { LayerGroupId, LayerGroupSummary } from '@/features/map/types/layerGroups';
import { Badge } from '@/shared/ui/Badge';
import { Loading } from '@/shared/ui/Loading/Loading';
import styles from './LayersPanel.module.css';

import IconClose from '@/shared/assets/icons/icon-close.svg?react';
import IconEye from '@/shared/assets/icons/icon-eye.svg?react';
import IconEyeOff from '@/shared/assets/icons/icon-access.svg?react';
import IconArrowRight from '@/shared/assets/icons/icon-angle-right.svg?react';
import IconSend from '@/shared/assets/icons/icon-send.svg?react';
import IconInfo from '@/shared/assets/icons/icon-info.svg?react';
import IconDownload from '@/shared/assets/icons/icon-download.svg?react';

export interface LayersPanelProps {
  isOpen: boolean;
  onClose: () => void;
  groups: LayerGroupSummary[];
  isLoading: boolean;
  draftReportsCount: number;
  onOpenGroup: (groupId: LayerGroupId) => void;
  onToggleGroupVisibility: (groupId: LayerGroupId) => void;
  onShowMesCartesInfo?: () => void;
  onOpenMesCartesWmsDialog?: () => void;
  onSendGroupDirectContributions?: (groupId: LayerGroupId) => void;
}

export function LayersPanel({
  isOpen,
  onClose,
  groups,
  isLoading,
  draftReportsCount,
  onOpenGroup,
  onToggleGroupVisibility,
  onShowMesCartesInfo,
  onOpenMesCartesWmsDialog,
  onSendGroupDirectContributions,
}: LayersPanelProps) {
  const { t } = useTranslation();
  const sendDirectContributionsLabel = t('layers.groups.sendDirectContributions');
  const mesCartesInfoLabel = t('layers.groups.mesCartesInfo');
  const mesCartesDownloadLabel = t('layers.groups.mesCartesDownload');

  return (
    <SlideUpPage
      isOpen={isOpen}
      onClose={onClose}
      presentation="sheet"
      sheetSize="tall"
    >
        <div className={styles.header}>
          <h2 className={styles.title}>{t('layers.title')}</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label='Close'>
            <IconClose className={styles.closeIcon} />
          </button>
        </div>
        <div className={styles.content}>
          {isLoading ? (
            <p className={styles.loading}>{t('layers.loading')}</p>
          ) : groups.length === 0 ? (
            <p className={styles.empty}>{t('layers.empty')}</p>
          ) : (
            <ul className={styles.groupList}>
              {groups.map((group) => {
                const isSubmittingDirectContribution =
                  group.directContribution?.isSubmitting === true;

                return (
                  <li key={group.id} className={styles.groupItem}>
                    <button
                      type='button'
                      className={styles.groupVisibilityButton}
                      onClick={() => onToggleGroupVisibility(group.id)}
                      disabled={!group.canToggle || isSubmittingDirectContribution}
                      aria-label={
                        group.visible
                          ? t('layers.groups.hideGroup')
                          : t('layers.groups.showGroup')
                      }
                    >
                      {group.visible ? (
                        <IconEye className={styles.groupVisibilityIcon} />
                      ) : (
                        <IconEyeOff className={styles.groupVisibilityIcon} />
                      )}
                    </button>
                    <button
                      type='button'
                      className={styles.groupButton}
                      onClick={() => onOpenGroup(group.id)}
                      disabled={isSubmittingDirectContribution}
                      aria-label={group.title}
                    >
                      <span className={styles.groupTitle}>
                        <span className={styles.groupTitleText}>{group.title}</span>
                        {group.id === 'signalements' && draftReportsCount > 0 && (
                          <Badge>{draftReportsCount}</Badge>
                        )}
                      </span>
                      <span className={styles.groupMeta}>
                        <span className={styles.groupCount}>{group.count}</span>
                        <IconArrowRight className={styles.groupArrowIcon} />
                      </span>
                    </button>
                    {group.id === 'mesCartes' && (
                      <>
                        <button
                          type='button'
                          className={styles.groupActionButton}
                          onClick={onShowMesCartesInfo}
                          disabled={!onShowMesCartesInfo || isSubmittingDirectContribution}
                          aria-label={mesCartesInfoLabel}
                        >
                          <IconInfo className={styles.groupActionIcon} />
                        </button>
                        <button
                          type='button'
                          className={styles.groupActionButton}
                          onClick={onOpenMesCartesWmsDialog}
                          disabled={!onOpenMesCartesWmsDialog || isSubmittingDirectContribution}
                          aria-label={mesCartesDownloadLabel}
                        >
                          <IconDownload className={styles.groupActionIcon} />
                        </button>
                      </>
                    )}
                    {group.directContribution && (
                      <button
                        type='button'
                        className={styles.groupActionButton}
                        onClick={() => onSendGroupDirectContributions?.(group.id)}
                        disabled={
                          !onSendGroupDirectContributions ||
                          group.directContribution.pendingChangesCount < 1 ||
                          isSubmittingDirectContribution
                        }
                        aria-label={`${sendDirectContributionsLabel} ${group.title}`}
                      >
                        {isSubmittingDirectContribution ? (
                          <Loading size='small' className={styles.groupActionLoading} />
                        ) : (
                          <IconSend className={styles.groupActionIcon} />
                        )}
                        {group.directContribution.pendingChangesCount > 0 && (
                          <span className={styles.groupActionBadge}>
                            {group.directContribution.pendingChangesCount}
                          </span>
                        )}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
    </SlideUpPage>
  );
}
