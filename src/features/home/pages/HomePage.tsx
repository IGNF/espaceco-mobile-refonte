import { useEffect, useMemo, useState } from "react";
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
import { useCommunity } from "@/features/community/hooks/useCommunity";
import { useOffline } from "@/features/offline/hooks/useOffline";

// PAGES //
import { MyInformationsPage } from "@/features/auth/pages/MyInformations/MyInformationsPage";
import { SettingsPage } from "@/features/settings/pages/SettingsPage";
import { GroupReportsPage } from "@/features/report/pages/GroupReports/GroupReportsPage";
import { MyReportsPage } from "@/features/report/pages/MyReports/MyReportsPage";
import { LogoutPage } from "@/features/auth/pages/Logout/LogoutPage";
import { CreateOrEditReportPage } from "@/features/report/pages/CreateOrEditReport/CreateOrEditReportPage";
import { NewReportPage } from "@/features/report/pages/NewReportChoice/NewReportPage";
import { AboutPage } from "@/features/about/pages/AboutPage";
import { HelpPage } from "@/features/help/pages/HelpPage";
import { MyCommunitiesSelectionPage } from "@/features/community/pages/MyCommunitiesSelection/MyCommunitiesSelectionPage";
import { OfflineManagementPage } from "@/features/offline/pages/OfflineManagementPage";
import { AboutCommunityPage } from "@/features/community/pages/AboutCommunity/AboutCommunityPage";
import { AboutReportsPage } from "@/features/report/pages/AboutReports/AboutReportsPage";

import { DirectContributionFeatureFormPage } from "@/features/map/pages/DirectContribution/DirectContributionFeatureFormPage";
import { DirectContributionFeatureDetailsPage } from "@/features/map/pages/DirectContribution/DirectContributionFeatureDetailsPage";

import { LayersPanelFlow } from "@/features/map/components/LayersPanelFlow";
import { useLayers } from "@/features/map/hooks/useLayers";
import { useCommunityMapLayers } from "@/features/map/hooks/useCommunityMapLayers";
import { useCommunityFeatureConsultation } from "@/features/map/hooks/useCommunityFeatureConsultation";
import { useDirectContributionLayers } from "@/features/map/hooks/useDirectContributionLayers";
import { useDirectContributionSession } from "@/features/map/hooks/useDirectContributionSession";
import { useOfflineRasterMapLayers } from "@/features/map/hooks/useOfflineRasterMapLayers";
import { useMountedCommunityVectorLayers } from "@/features/map/hooks/useMountedCommunityVectorLayers";
import { useSignalementMapLayers } from "@/features/map/hooks/useSignalementMapLayers";
import { DirectContributionMapOverlay } from "@/features/map/components/DirectContributionMapOverlay";
import { DirectContributionFeatureChoiceAlert } from "@/features/map/components/DirectContributionFeatureChoiceAlert";
import { DirectContributionConflictAlert } from "@/features/map/components/DirectContributionConflictAlert";
import { getCommunityLayerDirectContributionState } from "@/domain/community/directContribution";
import styles from "./HomePage.module.css";
import { overlayRoutes } from "@/app/router/routes";
import IconBurger from "@/shared/assets/icons/icon-burger.svg?react";
import IconSearch from "@/shared/assets/icons/icon-search.svg?react";
import IconGeolocation from "@/shared/assets/icons/icon-geolocation.svg?react";
import { HomeLoadingOverlay } from '@/features/home/components/HomeLoadingOverlay';
import { getCommunityLayerKey } from '@/shared/utils/layerKey';
import type { ReportType } from "@/domain/report/models";

// Routes that should open as slide-up overlays instead of navigating
type OverlayRoute = typeof overlayRoutes[number];

function isOverlayRoute(route: string): route is OverlayRoute {
  return overlayRoutes.includes(route as OverlayRoute);
}

export function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { setActiveCommunity } = useCommunity();
  const { mode: offlineMode, activeCommunityCache, rasterMaps } = useOffline();
  const {
    mapElementRef,
    mapRef,
    map,
    centerOnUserLocation,
    isLocating,
    isMapReady,
    hasInitialCenterCompleted,
  } = useMap({
    centerOnUserLocation: offlineMode !== 'offline',
    skipGeoportailCapabilities: offlineMode === 'offline',
  });
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
  } = useLayers(offlineMode, activeCommunityCache);
  useSignalementMapLayers(
    mapRef,
    signalementLayerVisibility,
    signalementLayerOpacity,
    signalementLayerOrder,
    isMapReady,
    offlineMode
  );
  const {
    pendingChangesCountByLayerKey,
    submittingByLayerKey,
    activeConflict,
    clearActiveConflict,
    confirmConflictResolutions,
    sendLayerDirectContributions,
    resetLayerDirectContributions,
  } = useDirectContributionLayers({
    mapRef,
    isMapReady,
    vectorLayers,
  });
  const {
    activeLayer: activeDirectContributionLayer,
    isSessionActive: isDirectContributionSessionActive,
    toolbarItems: directContributionToolbarItems,
    toolbarStatusText: directContributionToolbarStatusText,
    featureFormState: directContributionFeatureFormState,
    featureCandidates: directContributionFeatureCandidates,
    isFeatureChoiceOpen: isDirectContributionFeatureChoiceOpen,
    startSession: startDirectContributionSession,
    startFeatureEdition: startDirectContributionFeatureEdition,
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
  const mountableVectorLayers = hasInitialCenterCompleted ? vectorLayers : [];
  const mountedVectorLayers = useMountedCommunityVectorLayers({
    vectorLayers: mountableVectorLayers,
    pendingChangesCountByLayerKey,
    activeLayer: activeDirectContributionLayer,
  });
  const { isVectorLayersLoading } = useCommunityMapLayers(
    mapRef,
    geoportailLayers,
    mountedVectorLayers,
    isMapReady,
    offlineMode,
    activeCommunityCache
  );
  useOfflineRasterMapLayers(mapRef, rasterMaps, isMapReady, offlineMode);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLayersPanelOpen, setIsLayersPanelOpen] = useState(false);
  const [activeOverlay, setActiveOverlay] = useState<OverlayRoute | null>(null);
  const [offlineOverlayKey, setOfflineOverlayKey] = useState(0);
  const [newReportType, setReportType] = useState<ReportType>('standard');
  const [isCommunitySwitchLoading, setIsCommunitySwitchLoading] = useState(false);
  const [hasObservedCommunitySwitchLoading, setHasObservedCommunitySwitchLoading] = useState(false);
  const {
    featureCandidates: consultationFeatureCandidates,
    selectedFeatureCandidate: consultedFeatureCandidate,
    isFeatureChoiceOpen: isConsultationFeatureChoiceOpen,
    selectFeatureCandidate: selectConsultedFeatureCandidate,
    closeFeatureChoice: closeConsultationFeatureChoice,
    closeFeatureDetails: closeConsultedFeatureDetails,
    goBackFromFeatureDetails: goBackFromConsultedFeatureDetails,
  } = useCommunityFeatureConsultation({
    map,
    vectorLayers,
    disabled:
      isDirectContributionSessionActive ||
      activeConflict !== null ||
      activeOverlay === '/offline',
  });

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
      if (route === '/offline') {
        setOfflineOverlayKey((value) => value + 1);
      }

      setActiveOverlay(route);
    } else {
      navigate(route);
    }
  };

  const handleCloseOverlay = () => {
    setActiveOverlay(null);
  };

  const handleConfirmCommunityChange = async (communityId: number) => {
    setHasObservedCommunitySwitchLoading(false);
    setIsCommunitySwitchLoading(true);
    setActiveOverlay(null);

    try {
      await setActiveCommunity(communityId);
    } catch {
      setIsCommunitySwitchLoading(false);
    }
  };

  const handleNewReportStandard = () => {
    setReportType('standard');
    setActiveOverlay(null);
    setIsSearchOpen(false);
    setTimeout(() => {
      setActiveOverlay('/create-or-edit-report');
    }, 300);
  };

  const handleNewReportTrace = () => {
    setReportType('trace');
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

  const prepareLayerEdition = (layerKey: string) => {
    setIsLayersPanelOpen(false);
    setIsSearchOpen(false);

    const layer = vectorLayers.find(
      (candidateLayer) => getCommunityLayerKey(candidateLayer) === layerKey
    );
    if (layer?.visible === false) {
      // Editing a hidden layer is confusing and would keep it outside the normal visible-layer mount set.
      setLayerVisibility(layerKey, true);
    }
  };

  const handleEditLayer = (layerKey: string) => {
    prepareLayerEdition(layerKey);
    startDirectContributionSession(layerKey);
  };

  const handleEditConsultedFeature = () => {
    const candidate = consultedFeatureCandidate!;

    closeConsultedFeatureDetails();
    prepareLayerEdition(getCommunityLayerKey(candidate.layer));
    startDirectContributionFeatureEdition(candidate);
  };

  const consultedFeatureCanEdit = useMemo(() => {
    if (!consultedFeatureCandidate) {
      return false;
    }

    const layerKey = getCommunityLayerKey(consultedFeatureCandidate.layer);
    const directContributionState = getCommunityLayerDirectContributionState(
      consultedFeatureCandidate.layer,
      {
        pendingChangesCount: pendingChangesCountByLayerKey[layerKey] ?? 0,
        locked: lockedByLayerKey[layerKey],
        isSubmitting: submittingByLayerKey[layerKey],
      }
    );

    return Boolean(
      directContributionState?.editable &&
      !directContributionState.locked &&
      !directContributionState.isSubmitting
    );
  }, [
    consultedFeatureCandidate,
    lockedByLayerKey,
    pendingChangesCountByLayerKey,
    submittingByLayerKey,
  ]);

  const activeFeatureChoiceCandidates = isDirectContributionFeatureChoiceOpen
    ? directContributionFeatureCandidates
    : consultationFeatureCandidates;

  const handleSelectFeatureCandidate = (candidateKey: string) => {
    if (isDirectContributionFeatureChoiceOpen) {
      selectDirectContributionFeatureCandidate(candidateKey);
      return;
    }

    selectConsultedFeatureCandidate(candidateKey);
  };

  const handleCloseFeatureChoice = () => {
    if (isDirectContributionFeatureChoiceOpen) {
      closeDirectContributionFeatureChoice();
      return;
    }

    closeConsultationFeatureChoice();
  };

  const handleLogout = async () => {
    setActiveOverlay(null);

    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  const isAppDataLoading =
    isLayersLoading ||
    (offlineMode !== 'offline' && isVectorLayersLoading);

  const { showInitialLoadingOverlay } = useInitialAppLoading({
    isMapReady,
    hasInitialCenterCompleted,
    isAppDataLoading,
  });

  const isHomeLoadingOverlayVisible =
    showInitialLoadingOverlay || isCommunitySwitchLoading;

  useEffect(() => {
    if (!isCommunitySwitchLoading || !hasObservedCommunitySwitchLoading || isAppDataLoading) {
      if (isAppDataLoading) {
        setHasObservedCommunitySwitchLoading(true);
      }
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsCommunitySwitchLoading(false);
      setHasObservedCommunitySwitchLoading(false);
    }, 400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    hasObservedCommunitySwitchLoading,
    isAppDataLoading,
    isCommunitySwitchLoading,
  ]);

  const shouldShowOnboarding = showOnboarding && !isHomeLoadingOverlayVisible;

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

      <DirectContributionFeatureDetailsPage
        isOpen={consultedFeatureCandidate !== null}
        candidate={consultedFeatureCandidate}
        canEdit={consultedFeatureCanEdit}
        onEdit={handleEditConsultedFeature}
        onBack={
          consultationFeatureCandidates.length > 1
            ? goBackFromConsultedFeatureDetails
            : undefined
        }
        onClose={closeConsultedFeatureDetails}
      />

      <DirectContributionFeatureChoiceAlert
        isOpen={isDirectContributionFeatureChoiceOpen || isConsultationFeatureChoiceOpen}
        candidates={activeFeatureChoiceCandidates}
        onSelectCandidate={handleSelectFeatureCandidate}
        onClose={handleCloseFeatureChoice}
      />

      <DirectContributionConflictAlert
        key={
          activeConflict
            ? `${activeConflict.layerKey}-${activeConflict.conflicts
              .map((conflict) => conflict.key)
              .join('-')}`
            : 'direct-contribution-conflict'
        }
        isOpen={activeConflict !== null}
        conflict={activeConflict}
        onClose={clearActiveConflict}
        onConfirmResolutions={confirmConflictResolutions}
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
      {activeOverlay === '/my-informations' && (
        <MyInformationsPage
          isOpen
          onClose={handleCloseOverlay}
        />
      )}
      {activeOverlay === '/settings' && (
        <SettingsPage
          isOpen
          onClose={handleCloseOverlay}
        />
      )}
      {activeOverlay === '/logout-verification' && (
        <LogoutPage
          isOpen
          onClose={handleCloseOverlay}
          handleLogout={handleLogout}
        />
      )}
      {activeOverlay === '/group-reports' && (
        <GroupReportsPage
          isOpen
          onClose={handleCloseOverlay}
        />
      )}
      {activeOverlay === '/my-reports' && (
        <MyReportsPage
          isOpen
          onClose={handleCloseOverlay}
          map={map}
          onSearchPanelVisibilityChange={setIsSearchOpen}
        />
      )}
      {activeOverlay === '/new-report-choice' && (
        <NewReportPage
          isOpen
          onClose={handleCloseOverlay}
          onSelectStandard={handleNewReportStandard}
          onSelectTrace={handleNewReportTrace}
        />
      )}
      {activeOverlay === '/create-or-edit-report' && (
        <CreateOrEditReportPage
          isOpen
          onClose={handleCloseOverlay}
          mode="create"
          reportType={newReportType}
          map={map}
          onSearchPanelVisibilityChange={setIsSearchOpen}
        />
      )}
      {activeOverlay === '/my-communities' && (
        <MyCommunitiesSelectionPage
          isOpen
          onClose={handleCloseOverlay}
          onConfirmCommunityChange={handleConfirmCommunityChange}
        />
      )}
      {activeOverlay === '/offline' && (
        <OfflineManagementPage
          key={offlineOverlayKey}
          isOpen
          onClose={handleCloseOverlay}
          map={map}
          vectorLayers={vectorLayers}
          pendingChangesCountByLayerKey={pendingChangesCountByLayerKey}
          onSetLayerVisibility={setLayerVisibility}
          onCenterOnUserLocation={centerOnUserLocation}
          isLocating={isLocating}
        />
      )}
      {activeOverlay === '/about-community' && (
        <AboutCommunityPage
          isOpen
          onClose={handleCloseOverlay}
        />
      )}
      {activeOverlay === '/about' && (
        <AboutPage
          isOpen
          onClose={handleCloseOverlay}
        />
      )}
      {activeOverlay === '/help' && (
        <HelpPage
          isOpen
          onClose={handleCloseOverlay}
        />
      )}
      {activeOverlay === '/about-reports' && (
        <AboutReportsPage
          isOpen
          onClose={handleCloseOverlay}
        />
      )}
      <HomeLoadingOverlay isVisible={isHomeLoadingOverlayVisible} />
    </div>
  );
}
