import { useTranslation } from "react-i18next";
import styles from "./BottomTabbar.module.css";

import IconLocation from "@/shared/assets/icons/icon-location.svg?react";
import IconGuichet from "@/shared/assets/icons/icon-guichet.svg?react";
import IconLayers from "@/shared/assets/icons/icon-layers.svg?react";

export type TabId = "signalement" | "guichet" | "couches";

export interface BottomTabbarProps {
	onTabClick?: (tab: TabId) => void;
}

export function BottomTabbar({ onTabClick }: BottomTabbarProps) {
	const { t } = useTranslation();

	const handleTabClick = (tab: TabId) => {
		onTabClick?.(tab);
	};

	return (
		<nav className={styles.tabbar}>
			<button
				className={styles.tab}
				onClick={() => handleTabClick("signalement")}
			>
				<IconLocation className={styles.tabIcon} />
				{t("home.tabs.signalement")}
			</button>
			<button
				className={styles.tab}
				onClick={() => handleTabClick("guichet")}
			>
				<IconGuichet className={styles.tabIcon} />
				{t("home.tabs.guichet")}
			</button>
			<button
				className={styles.tab}
				onClick={() => handleTabClick("couches")}
			>
				<IconLayers className={styles.tabIcon} />
				{t("home.tabs.couches")}
			</button>
		</nav>
	);
}
