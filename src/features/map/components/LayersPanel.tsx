import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import type { CommunityLayer } from "@ign/mobile-core";
import styles from "./LayersPanel.module.css";

import IconClose from "@/shared/assets/icons/icon-close.svg?react";

const ANIMATION_DURATION = 300;

export interface LayersPanelProps {
	isOpen: boolean;
	onClose: () => void;
	layers: CommunityLayer[];
	isLoading: boolean;
}

export function LayersPanel({ isOpen, onClose, layers, isLoading }: LayersPanelProps) {
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
					) : layers.length === 0 ? (
						<p className={styles.empty}>{t("layers.empty")}</p>
					) : (
						<ul className={styles.layerList}>
							{layers.map((layer) => (
								<li key={layer.id} className={styles.layerItem}>
									<span className={styles.layerTitle}>{layer.title}</span>
									<button className={styles.layerAction} aria-label={`Toggle ${layer.title}`}>
										+
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
