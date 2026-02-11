import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import type { LayerGroupId, LayerGroupSummary } from "@/features/map/types/layerGroups";
import styles from "./LayersPanel.module.css";

import IconClose from "@/shared/assets/icons/icon-close.svg?react";
import IconArrowRight from "@/shared/assets/icons/icon-angle-right.svg?react";

const ANIMATION_DURATION = 300;

export interface LayersPanelProps {
	isOpen: boolean;
	onClose: () => void;
	groups: LayerGroupSummary[];
	isLoading: boolean;
	onOpenGroup: (groupId: LayerGroupId) => void;
}

export function LayersPanel({
	isOpen,
	onClose,
	groups,
	isLoading,
	onOpenGroup,
}: LayersPanelProps) {
	const { t } = useTranslation();
	const [isVisible, setIsVisible] = useState(false);
	const [shouldRender, setShouldRender] = useState(false);

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

	const overlayClasses = [styles.overlay, isVisible ? styles.overlayVisible : ""]
		.filter(Boolean)
		.join(" ");

	const panelClasses = [styles.panel, isVisible ? styles.panelVisible : ""]
		.filter(Boolean)
		.join(" ");

	const content = (
		<>
			<div className={overlayClasses} onClick={onClose} />
			<div className={panelClasses}>
				<div className={styles.header}>
					<h2 className={styles.title}>{t("layers.title")}</h2>
					<button className={styles.closeButton} onClick={onClose} aria-label="Close">
						<IconClose className={styles.closeIcon} />
					</button>
				</div>
				<div className={styles.content}>
					{isLoading ? (
						<p className={styles.loading}>{t("layers.loading")}</p>
					) : groups.length === 0 ? (
						<p className={styles.empty}>{t("layers.empty")}</p>
					) : (
						<ul className={styles.groupList}>
							{groups.map((group) => (
								<li key={group.id} className={styles.groupItem}>
									<button
										type="button"
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
