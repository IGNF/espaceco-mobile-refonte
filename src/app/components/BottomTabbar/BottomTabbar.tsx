import { useTranslation } from "react-i18next";
import styles from "./BottomTabbar.module.css";

import IconLocation from "@/shared/assets/icons/icon-location.svg?react";
import IconGuichet from "@/shared/assets/icons/icon-guichet.svg?react";
import IconLayers from "@/shared/assets/icons/icon-layers.svg?react";

export type TabId = "signalement" | "guichet" | "couches";

export interface BottomTabbarProps {
	onTabClick?: (tab: TabId) => void;
	highlightedTab?: TabId | null;
}

export function BottomTabbar({ onTabClick, highlightedTab }: BottomTabbarProps) {
	const { t } = useTranslation();

	const handleTabClick = (tab: TabId) => {
		onTabClick?.(tab);
	};

	const getTabClassName = (tab: TabId) => {
		const classes = [styles.tab];
		if (highlightedTab === tab) {
			classes.push(styles.highlighted);
		}
		return classes.join(" ");
	};

	return (
		<nav className={styles.tabbar}>
			<button
				className={getTabClassName("signalement")}
				onClick={() => handleTabClick("signalement")}
				data-onboarding-target="signalement"
			>
				<IconLocation className={styles.tabIcon} />
				{t("home.tabs.signalement")}
			</button>
			<button
				className={getTabClassName("guichet")}
				onClick={() => handleTabClick("guichet")}
				data-onboarding-target="guichet"
			>
				<IconGuichet className={styles.tabIcon} />
				{t("home.tabs.guichet")}
			</button>
			<button
				className={getTabClassName("couches")}
				onClick={() => handleTabClick("couches")}
				data-onboarding-target="couches"
			>
				<IconLayers className={styles.tabIcon} />
				{t("home.tabs.couches")}
			</button>
		</nav>
	);
}
