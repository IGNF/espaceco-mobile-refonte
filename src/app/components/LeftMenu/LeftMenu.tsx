import { useState } from "react";
import { useTranslation } from "react-i18next";
import styles from "./LeftMenu.module.css";

import IconLocation from "@/shared/assets/icons/icon-location.svg?react";
import IconGuichet from "@/shared/assets/icons/icon-guichet.svg?react";
import IconUser from "@/shared/assets/icons/icon-user.svg?react";
import IconConfiguration from "@/shared/assets/icons/icon-configuration.svg?react";
import IconHelp from "@/shared/assets/icons/icon-help.svg?react";
import IconInfo from "@/shared/assets/icons/icon-info.svg?react";
import IconAngleDown from "@/shared/assets/icons/icon-angle-down.svg?react";
import type { AppUser } from "@/domain/user/models";
import { useCommunity } from "@/features/community/hooks/useCommunity";

export interface LeftMenuProps {
	isOpen: boolean;
	onClose: () => void;
	user?: AppUser;
	onNavigate?: (route: string) => void;
	onLogout?: () => void;
}

type MenuGroupId = "signalements" | "guichet" | "monCompte";

interface MenuItem {
	id: string;
	labelKey: string;
	route: string;
}

interface MenuGroup {
	id: MenuGroupId;
	titleKey: string;
	icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
	items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
	{
		id: "signalements",
		titleKey: "leftMenu.signalements.title",
		icon: IconLocation,
		items: [
			{ id: "signalementsGroupe", labelKey: "leftMenu.signalements.signalementsGroupe", route: "/group-contributions" },
			{ id: "mesSignalements", labelKey: "leftMenu.signalements.mesSignalements", route: "/my-contributions" },
			{ id: "nouveauSignalement", labelKey: "leftMenu.signalements.nouveauSignalement", route: "/new-contribution" },
			{ id: "aProposSignalements", labelKey: "leftMenu.signalements.aPropos", route: "/about-contributions" },
		],
	},
	{
		id: "guichet",
		titleKey: "leftMenu.guichet.title",
		icon: IconGuichet,
		items: [
			{ id: "guichet", labelKey: "leftMenu.guichet.guichet", route: "/community-selection" },
			{ id: "aProposGuichet", labelKey: "leftMenu.guichet.aPropos", route: "/about-community" },
		],
	},
	{
		id: "monCompte",
		titleKey: "leftMenu.monCompte.title",
		icon: IconUser,
		items: [
			{ id: "mesInformations", labelKey: "leftMenu.monCompte.mesInformations", route: "/my-informations" },
			{ id: "mesGroupes", labelKey: "leftMenu.monCompte.mesGroupes", route: "/my-communities" },
			{ id: "deconnexion", labelKey: "leftMenu.monCompte.deconnexion", route: "logout" },
		],
	},
];

interface StandaloneItem {
	id: string;
	labelKey: string;
	icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
	route: string;
}

const standaloneItems: StandaloneItem[] = [
	{ id: "parametres", labelKey: "leftMenu.parametres", icon: IconConfiguration, route: "/settings" },
	{ id: "aide", labelKey: "leftMenu.aide", icon: IconHelp, route: "/help" },
	{ id: "aPropos", labelKey: "leftMenu.aPropos", icon: IconInfo, route: "/about" },
];

export function LeftMenu({ isOpen, onClose, user, onNavigate, onLogout }: LeftMenuProps) {
	const { t } = useTranslation();
	const { activeCommunity } = useCommunity();
	const [expandedGroups, setExpandedGroups] = useState<Set<MenuGroupId>>(
		new Set([])
	);

	const toggleGroup = (groupId: MenuGroupId) => {
		setExpandedGroups((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(groupId)) {
				newSet.delete(groupId);
			} else {
				newSet.add(groupId);
			}
			return newSet;
		});
	};

	const handleItemClick = (route: string) => {
		if (route === "logout") {
			onLogout?.();
		} else {
      // for now, simply navigate to the route
      // then, depending on the route, we might want to open a modal or a drawer
			onNavigate?.(route);
		}
		onClose();
	};

	const handleOverlayClick = () => {
		onClose();
	};

	return (
		<>
			<div
				className={`${styles.overlay} ${isOpen ? styles.overlayVisible : ""}`}
				onClick={handleOverlayClick}
				aria-hidden="true"
			/>
			<nav
				className={`${styles.menu} ${isOpen ? styles.menuOpen : ""}`}
				aria-label="Main menu"
				aria-hidden={!isOpen}
			>
				{/* User profile section */}
				{user && (
					<div className={styles.userSection}>
						<div className={styles.avatar}>
							{user.avatarUrl ? (
								<img src={user.avatarUrl} alt={user.username} className={styles.avatarImage} />
							) : (
								<div className={styles.avatarPlaceholder}>
									{user.username.charAt(0).toUpperCase()}
								</div>
							)}
						</div>
						<div className={styles.userInfo}>
							<span className={styles.userName}>{user.username}</span>
							{activeCommunity && (
								<span className={styles.userLocation}>{activeCommunity.name}</span>
							)}
						</div>
					</div>
				)}

				{/* Menu groups */}
				<div className={styles.menuContent}>
					{menuGroups.map((group) => {
						const IconComponent = group.icon;
						const isExpanded = expandedGroups.has(group.id);

						return (
							<div key={group.id} className={styles.menuGroup}>
								<button
									className={styles.groupHeader}
									onClick={() => toggleGroup(group.id)}
									aria-expanded={isExpanded}
								>
									<IconComponent className={styles.groupIcon} />
									<span className={styles.groupTitle}>{t(group.titleKey)}</span>
									<IconAngleDown
										className={`${styles.chevron} ${isExpanded ? styles.chevronExpanded : ""}`}
									/>
								</button>
								<div
									className={`${styles.groupItems} ${isExpanded ? styles.groupItemsExpanded : ""}`}
								>
									{group.items.map((item) => (
										<button
											key={item.id}
											className={styles.menuItem}
											onClick={() => handleItemClick(item.route)}
										>
											{t(item.labelKey)}
										</button>
									))}
								</div>
							</div>
						);
					})}

					{/* Standalone items */}
					<div className={styles.standaloneItems}>
						{standaloneItems.map((item) => {
							const IconComponent = item.icon;
							return (
								<button
									key={item.id}
									className={styles.standaloneItem}
									onClick={() => handleItemClick(item.route)}
								>
									<IconComponent className={styles.standaloneIcon} />
									<span>{t(item.labelKey)}</span>
								</button>
							);
						})}
					</div>
				</div>
			</nav>
		</>
	);
}
