import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BottomTabbar, type TabId } from "@/app/components/BottomTabbar";
import { LeftMenu } from "@/app/components/LeftMenu/LeftMenu";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useMap } from "@/features/home/hooks/useMap";
import { useOnboarding, type OnboardingStep } from "@/features/onboarding/hooks/useOnboarding";
import { OnboardingModal } from "@/features/onboarding/components/OnboardingModal";
import { MyInformationsPage } from "@/features/auth/pages/MyInformations/MyInformationsPage";
import { GroupReportsPage } from "@/features/report/pages/GroupReports/GroupReportsPage";
import styles from "./HomePage.module.css";

import { overlayRoutes } from "@/app/router/routes";

import IconBurger from "@/shared/assets/icons/icon-burger.svg?react";
import IconSearch from "@/shared/assets/icons/icon-search.svg?react";
import IconGeolocation from "@/shared/assets/icons/icon-geolocation.svg?react";
import { LogoutPage } from "@/features/auth/pages/Logout/LogoutPage";

// Routes that should open as slide-up overlays instead of navigating
type OverlayRoute = typeof overlayRoutes[number];

function isOverlayRoute(route: string): route is OverlayRoute {
	return overlayRoutes.includes(route as OverlayRoute);
}

export function HomePage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { user, logout } = useAuth();
	const { mapElementRef, centerOnUserLocation, isLocating } = useMap();
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [activeOverlay, setActiveOverlay] = useState<OverlayRoute | null>(null);

	const {
		showModal: showOnboarding,
		isTourMode,
		currentStep,
		currentStepIndex,
		totalSteps,
		startTour,
		skipOnboarding,
		nextStep,
		previousStep,
		closeOnboarding,
	} = useOnboarding();

	const getHighlightedTab = (): TabId | null => {
		if (!isTourMode || !currentStep) return null;
		if (currentStep === "signalement" || currentStep === "guichet" || currentStep === "couches") {
			return currentStep;
		}
		return null;
	};

	const isHighlighted = (target: OnboardingStep): boolean => {
		return isTourMode && currentStep === target;
	};

	const handleBurgerClick = () => {
		setIsMenuOpen(true);
	};

	const handleMenuClose = () => {
		setIsMenuOpen(false);
	};

	const handleMenuNavigate = (route: string) => {
		if (isOverlayRoute(route)) {
			setActiveOverlay(route);
		} else {
			navigate(route);
		}
	};

	const handleCloseOverlay = () => {
		setActiveOverlay(null);
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
					className={`${styles.burgerButton} ${isHighlighted("menu") ? styles.highlighted : ""}`}
					onClick={handleBurgerClick}
					aria-label="Menu"
					data-onboarding-target="menu"
				>
					<IconBurger className={styles.burgerIcon} />
				</button>
				<h1 className={styles.title}>{t("home.title")}</h1>
				<button
					className={`${styles.searchButton} ${isHighlighted("search") ? styles.highlighted : ""}`}
					onClick={handleSearchClick}
					aria-label="Search"
					data-onboarding-target="search"
				>
					<IconSearch className={styles.searchIcon} />
				</button>
			</header>

			<main className={styles.main}>
				<div className={styles.map} ref={mapElementRef} />
			</main>

			{/* <p className={styles.copyright}>
				{t("home.copyright")}
			</p> */}

			<button
				className={`${styles.geolocationButton} ${isHighlighted("geolocation") ? styles.highlighted : ""}`}
				onClick={centerOnUserLocation}
				disabled={isLocating}
				aria-label="Center on my position"
				data-onboarding-target="geolocation"
			>
				<IconGeolocation className={styles.geolocationIcon} />
			</button>

			<BottomTabbar onTabClick={handleTabClick} highlightedTab={getHighlightedTab()} />

			<OnboardingModal
				isOpen={showOnboarding}
				isTourMode={isTourMode}
				currentStep={currentStep}
				currentStepIndex={currentStepIndex}
				totalSteps={totalSteps}
				onStartTour={startTour}
				onSkip={skipOnboarding}
				onNext={nextStep}
				onPrevious={previousStep}
				onClose={closeOnboarding}
			/>

			{/* Overlay pages */}
			<MyInformationsPage
				isOpen={activeOverlay === '/my-informations'}
				onClose={handleCloseOverlay}
			/>
			<LogoutPage
				isOpen={activeOverlay === '/logout-verification'}
				onClose={handleCloseOverlay}
				handleLogout={handleLogout}
			/>
			<GroupReportsPage
				isOpen={activeOverlay === '/group-reports'}
				onClose={handleCloseOverlay}
			/>
		</div>
	);
}
