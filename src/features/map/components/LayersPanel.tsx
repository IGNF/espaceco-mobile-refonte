import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import type { LayerGroupId, LayerGroupSummary } from '@/features/map/types/layerGroups';
import styles from './LayersPanel.module.css';

import IconClose from '@/shared/assets/icons/icon-close.svg?react';
import IconEye from '@/shared/assets/icons/icon-eye.svg?react';
import IconEyeOff from '@/shared/assets/icons/icon-access.svg?react';
import IconArrowRight from '@/shared/assets/icons/icon-angle-right.svg?react';
import IconSend from '@/shared/assets/icons/icon-send.svg?react';

const ANIMATION_DURATION = 300;

export interface LayersPanelProps {
	isOpen: boolean;
	onClose: () => void;
	groups: LayerGroupSummary[];
	isLoading: boolean;
	onOpenGroup: (groupId: LayerGroupId) => void;
	onToggleGroupVisibility: (groupId: LayerGroupId) => void;
	onSendGroupDirectContributions?: (groupId: LayerGroupId) => void;
}

export function LayersPanel({
	isOpen,
	onClose,
	groups,
	isLoading,
	onOpenGroup,
	onToggleGroupVisibility,
	onSendGroupDirectContributions,
}: LayersPanelProps) {
	const { t } = useTranslation();
	const [isVisible, setIsVisible] = useState(false);
	const [shouldRender, setShouldRender] = useState(false);
	const sendDirectContributionsLabel = t('layers.groups.sendDirectContributions');

	if (isOpen && !shouldRender) {
		setShouldRender(true);
	}
	if (!isOpen && isVisible) {
		setIsVisible(false);
	}

	useEffect(() => {
		if (isOpen) {
			const timer = setTimeout(() => {
				setIsVisible(true);
			}, 20);
			return () => clearTimeout(timer);
		} else {
			const timer = setTimeout(() => {
				setShouldRender(false);
			}, ANIMATION_DURATION);
			return () => clearTimeout(timer);
		}
	}, [isOpen]);

	if (!shouldRender) return null;

	const overlayClasses = [styles.overlay, isVisible ? styles.overlayVisible : '']
		.filter(Boolean)
		.join(' ');

	const panelClasses = [styles.panel, isVisible ? styles.panelVisible : '']
		.filter(Boolean)
		.join(' ');

	const content = (
		<>
			<div className={overlayClasses} onClick={onClose} />
			<div className={panelClasses}>
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
							{groups.map((group) => (
								<li key={group.id} className={styles.groupItem}>
									<button
										type='button'
										className={styles.groupVisibilityButton}
										onClick={() => onToggleGroupVisibility(group.id)}
										disabled={!group.canToggle}
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
										aria-label={group.title}
									>
										<span className={styles.groupTitle}>{group.title}</span>
										<span className={styles.groupMeta}>
											<span className={styles.groupCount}>{group.count}</span>
											<IconArrowRight className={styles.groupArrowIcon} />
										</span>
									</button>
									{group.directContribution && (
										<button
											type='button'
											className={styles.groupActionButton}
											onClick={() => onSendGroupDirectContributions?.(group.id)}
											disabled={
												!onSendGroupDirectContributions ||
												group.directContribution.pendingChangesCount < 1
											}
											aria-label={`${sendDirectContributionsLabel} ${group.title}`}
										>
											<IconSend className={styles.groupActionIcon} />
											{group.directContribution.pendingChangesCount > 0 && (
												<span className={styles.groupActionBadge}>
													{group.directContribution.pendingChangesCount}
												</span>
											)}
										</button>
									)}
								</li>
							))}
						</ul>
					)}
				</div>
			</div>
		</>
	);

	return createPortal(content, document.body);
}
