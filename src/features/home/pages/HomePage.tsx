import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BottomTabbar, type TabId } from "@/app/components/BottomTabbar";
import { LeftMenu } from "@/app/components/LeftMenu/LeftMenu";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useMap } from "@/features/home/hooks/useMap";
import { Button } from "@/shared/ui/Button";
import styles from "./HomePage.module.css";

import IconBurger from "@/shared/assets/icons/icon-burger.svg?react";
import IconSearch from "@/shared/assets/icons/icon-search.svg?react";
import IconGeolocation from "@/shared/assets/icons/icon-geolocation.svg?react";


export function HomePage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { user, logout } = useAuth();
	const { mapElementRef, centerOnUserLocation, isLocating } = useMap();
	const [isMenuOpen, setIsMenuOpen] = useState(false);

	const handleBurgerClick = () => {
		setIsMenuOpen(true);
	};

	const handleMenuClose = () => {
		setIsMenuOpen(false);
	};

	const handleMenuNavigate = (route: string) => {
		navigate(route);
	};

	const handleSearchClick = () => {
		// TODO: Handle search action
		console.log("Search clicked");
	};

	const handleTabClick = (tab: TabId) => {
		// TODO: Handle tab action
		console.log("Tab clicked:", tab);
	};

	const handleLogout = () => {
		logout();
		navigate("/login");
	};

	return (
		<div className={styles.container}>
			<LeftMenu
				isOpen={isMenuOpen}
				onClose={handleMenuClose}
				user={user ?? undefined}
				onNavigate={handleMenuNavigate}
				onLogout={handleLogout}
			/>
			<header className={styles.header}>
				<button
					className={styles.burgerButton}
					onClick={handleBurgerClick}
					aria-label="Menu"
				>
					<IconBurger className={styles.burgerIcon} />
				</button>
				<h1 className={styles.title}>{t("home.title")}</h1>
				<button
					className={styles.searchButton}
					onClick={handleSearchClick}
					aria-label="Search"
				>
					<IconSearch className={styles.searchIcon} />
				</button>
			</header>

			<main className={styles.main}>
				<div className={styles.map} ref={mapElementRef} />
			</main>

      <p className={styles.copyright}>
        {t("home.copyright")}
      </p>

			<button
				className={styles.geolocationButton}
				onClick={centerOnUserLocation}
				disabled={isLocating}
				aria-label="Center on my position"
			>
				<IconGeolocation className={styles.geolocationIcon} />
			</button>

			<BottomTabbar onTabClick={handleTabClick} />
		</div>
	);
}
