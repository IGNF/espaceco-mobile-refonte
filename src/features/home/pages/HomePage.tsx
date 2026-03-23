import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getUid } from "ol/util";
import { BottomTabbar, type TabId } from "@/app/components/BottomTabbar";
import { LeftMenu } from "@/app/components/LeftMenu/LeftMenu";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useMap } from "@/features/home/hooks/useMap";
import { useInitialAppLoading } from "@/features/home/hooks/useInitialAppLoading";
import { useOnboarding, type OnboardingStep } from "@/features/onboarding/hooks/useOnboarding";
import { OnboardingModal } from "@/features/onboarding/components/OnboardingModal";
import { SearchPanel } from "@/features/search/components/SearchPanel";
import { MyInformationsPage } from "@/features/auth/pages/MyInformations/MyInformationsPage";
import { SettingsPage } from "@/features/settings/pages/SettingsPage";
import { GroupReportsPage } from "@/features/report/pages/GroupReports/GroupReportsPage";
import { MyReportsPage } from "@/features/report/pages/MyReports/MyReportsPage";
import { LayersPanelFlow } from "@/features/map/components/LayersPanelFlow";
import { useLayers } from "@/features/map/hooks/useLayers";
import { useCommunityMapLayers } from "@/features/map/hooks/useCommunityMapLayers";
import { useDirectContributionLayers } from "@/features/map/hooks/useDirectContributionLayers";
import { useDirectContributionSession } from "@/features/map/hooks/useDirectContributionSession";
import { useSignalementMapLayers } from "@/features/map/hooks/useSignalementMapLayers";
import { DirectContributionMapOverlay } from "@/features/map/components/DirectContributionMapOverlay";
import { DirectContributionFeatureChoiceAlert } from "@/features/map/components/DirectContributionFeatureChoiceAlert";
import { DirectContributionFeatureFormPage } from "@/features/map/pages/DirectContribution/DirectContributionFeatureFormPage";
import styles from "./HomePage.module.css";

import { overlayRoutes } from "@/app/router/routes";

import IconBurger from "@/shared/assets/icons/icon-burger.svg?react";
import IconSearch from "@/shared/assets/icons/icon-search.svg?react";
import IconGeolocation from "@/shared/assets/icons/icon-geolocation.svg?react";
import { LogoutPage } from "@/features/auth/pages/Logout/LogoutPage";
import { CreateOrEditReportPage } from "@/features/report/pages/CreateOrEditReport/CreateOrEditReportPage";
import { NewReportPage } from "@/features/report/pages/NewReportChoice/NewReportPage";
import { HomeLoadingOverlay } from '@/features/home/components/HomeLoadingOverlay';

// Routes that should open as slide-up overlays instead of navigating
type OverlayRoute = typeof overlayRoutes[number];
type NewReportType = 'standard' | 'trace';

function isOverlayRoute(route: string): route is OverlayRoute {
  return overlayRoutes.includes(route as OverlayRoute);
}

export function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { mapElementRef, mapRef, map, centerOnUserLocation, isLocating, isMapReady, isMapLoading } = useMap();
  const {
    layers,
    geoportailLayers,
    vectorLayers,
    lockedByLayerKey,
    signalementLayerVisibility,
    signalementLayerOpacity,
    signalementLayerOrder,
    isLoading: isLayersLoading,
    setLayerVisibility,
    setLayerOpacity,
    setGroupLayerOrder,
    setLayerDirectContributionLock,
  } = useLayers();
  useCommunityMapLayers(mapRef, geoportailLayers, vectorLayers, isMapReady);
  useSignalementMapLayers(
    mapRef,
    signalementLayerVisibility,
    signalementLayerOpacity,
    signalementLayerOrder,
    isMapReady
  );
  const {
    pendingChangesCountByLayerKey,
    submittingByLayerKey,
    sendLayerDirectContributions,
    resetLayerDirectContributions,
  } = useDirectContributionLayers({
    mapRef,
    isMapReady,
    vectorLayers,
  });
  const {
    isSessionActive: isDirectContributionSessionActive,
    toolbarItems: directContributionToolbarItems,
    toolbarStatusText: directContributionToolbarStatusText,
    featureFormState: directContributionFeatureFormState,
    featureCandidates: directContributionFeatureCandidates,
    isFeatureChoiceOpen: isDirectContributionFeatureChoiceOpen,
    startSession: startDirectContributionSession,
    triggerToolbarAction: triggerDirectContributionToolbarAction,
    saveFeatureAttributes: saveDirectContributionFeatureAttributes,
    cancelFeatureForm: cancelDirectContributionFeatureForm,
    selectFeatureCandidate: selectDirectContributionFeatureCandidate,
    closeFeatureChoice: closeDirectContributionFeatureChoice,
  } = useDirectContributionSession({
    map,
    isMapReady,
    vectorLayers,
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLayersPanelOpen, setIsLayersPanelOpen] = useState(false);
  const [activeOverlay, setActiveOverlay] = useState<OverlayRoute | null>(null);
  const [newReportType, setNewReportType] = useState<NewReportType>('standard');

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

  const handleNewReportStandard = () => {
    setNewReportType('standard');
    setActiveOverlay(null);
    setIsSearchOpen(false);
    setTimeout(() => {
      setActiveOverlay('/create-or-edit-report');
    }, 300);
  };

  const handleNewReportTrace = () => {
    setNewReportType('trace');
    setActiveOverlay(null);
    setIsSearchOpen(false);
    setTimeout(() => {
      setActiveOverlay('/create-or-edit-report');
    }, 300);
  };

  const handleSearchClick = () => {
    setIsSearchOpen((prev) => !prev);
  };

  const handleTabClick = (tab: TabId) => {
    if (tab === "couches" && !isLayersPanelOpen) {
      setIsLayersPanelOpen(true);
    }
    else if (tab === "signalement") {
      setActiveOverlay('/new-report-choice');
    }
    else if (tab === "guichet") {
      console.log('guichet');
    }
  };

  const handleEditLayer = (layerKey: string) => {
    setIsLayersPanelOpen(false);
    setIsSearchOpen(false);
    startDirectContributionSession(layerKey);
  };

  const handleLogout = async () => {
    setActiveOverlay(null);

    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  const { showInitialLoadingOverlay } = useInitialAppLoading({
    isMapReady,
    isMapLoading,
    isLayersLoading,
  });
  const shouldShowOnboarding = showOnboarding && !showInitialLoadingOverlay;

  return (
    <div className={styles.container}>
      <LeftMenu
        isOpen={isMenuOpen}
        onClose={handleMenuClose}
        user={user ?? undefined}
        onNavigate={handleMenuNavigate}
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
        <SearchPanel
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          map={map}
        />
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

      <BottomTabbar
        onTabClick={handleTabClick}
        highlightedTab={getHighlightedTab()}
        activeTab={isLayersPanelOpen ? "couches" : null}
      />

      <LayersPanelFlow
        isOpen={isLayersPanelOpen}
        onClose={() => setIsLayersPanelOpen(false)}
        layers={layers}
        geoportailLayers={geoportailLayers}
        vectorLayers={vectorLayers}
        lockedByLayerKey={lockedByLayerKey}
        signalementLayerVisibility={signalementLayerVisibility}
        signalementLayerOpacity={signalementLayerOpacity}
        signalementLayerOrder={signalementLayerOrder}
        pendingChangesCountByLayerKey={pendingChangesCountByLayerKey}
        submittingByLayerKey={submittingByLayerKey}
        isLoading={isLayersLoading}
        onSetLayerVisibility={setLayerVisibility}
        onSetLayerOpacity={setLayerOpacity}
        onSetGroupLayerOrder={setGroupLayerOrder}
        onEditLayer={handleEditLayer}
        onSendLayerDirectContributions={sendLayerDirectContributions}
        onResetLayerDirectContributions={resetLayerDirectContributions}
        onToggleLayerDirectContributionLock={setLayerDirectContributionLock}
      />

      <DirectContributionMapOverlay
        isOpen={isDirectContributionSessionActive && directContributionFeatureFormState === null}
        items={directContributionToolbarItems}
        statusText={directContributionToolbarStatusText}
        onItemClick={triggerDirectContributionToolbarAction}
      />

      <DirectContributionFeatureFormPage
        key={
          directContributionFeatureFormState
            ? `${directContributionFeatureFormState.mode}-${getUid(directContributionFeatureFormState.feature)}`
            : 'direct-contribution-form'
        }
        isOpen={directContributionFeatureFormState !== null}
        mode={directContributionFeatureFormState?.mode ?? 'edit'}
        table={directContributionFeatureFormState?.table ?? null}
        feature={directContributionFeatureFormState?.feature ?? null}
        onSave={saveDirectContributionFeatureAttributes}
        onCancel={cancelDirectContributionFeatureForm}
      />

      <DirectContributionFeatureChoiceAlert
        isOpen={isDirectContributionFeatureChoiceOpen}
        candidates={directContributionFeatureCandidates}
        onSelectCandidate={selectDirectContributionFeatureCandidate}
        onClose={closeDirectContributionFeatureChoice}
      />

      <OnboardingModal
        isOpen={shouldShowOnboarding}
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
      <SettingsPage
        isOpen={activeOverlay === '/settings'}
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
      <MyReportsPage
        isOpen={activeOverlay === '/my-reports'}
        onClose={handleCloseOverlay}
        map={map}
        onSearchPanelVisibilityChange={setIsSearchOpen}
      />
      <NewReportPage
        isOpen={activeOverlay === '/new-report-choice'}
        onClose={handleCloseOverlay}
        onSelectStandard={handleNewReportStandard}
        onSelectTrace={handleNewReportTrace}
      />
      <CreateOrEditReportPage
        isOpen={activeOverlay === '/create-or-edit-report'}
        onClose={handleCloseOverlay}
        mode="create"
        reportType={newReportType}
        map={map}
        onSearchPanelVisibilityChange={setIsSearchOpen}
      />

      <HomeLoadingOverlay isVisible={showInitialLoadingOverlay} />
    </div>
  );
}
