import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BottomTabbar, type TabId } from "@/app/components/BottomTabbar";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { Button } from "@/shared/ui/Button";
import styles from "./HomePage.module.css";

import IconBurger from "@/shared/assets/icons/icon-burger.svg?react";
import IconSearch from "@/shared/assets/icons/icon-search.svg?react";


export function HomePage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { logout } = useAuth();

	const handleBurgerClick = () => {
		// TODO: Open side menu
	};

	const handleSearchClick = () => {
		// TODO: Handle search action (modal, alert, etc.)
		console.log("Search clicked");
	};

	const handleTabClick = (tab: TabId) => {
		// TODO: Handle tab action (modal, alert, etc.)
		console.log("Tab clicked:", tab);
	};

	const handleLogout = () => {
		logout();
		navigate("/login");
	};

	return (
		<div className={styles.container}>
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
				{/* OpenLayers map will be rendered here */}
			</main>

			<Button
				className={styles.logoutButton}
				color="danger"
				variant="solid"
				onClick={handleLogout}
			>
				{t("home.logout")}
			</Button>

			<BottomTabbar onTabClick={handleTabClick} />
		</div>
	);
}
