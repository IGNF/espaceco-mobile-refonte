import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import { getUid } from "ol/util";
import { BottomTabbar, type TabId } from "@/app/components/BottomTabbar";
import { LeftMenu } from "@/app/components/LeftMenu/LeftMenu";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { useMap } from "@/features/home/hooks/useMap";
import { useGpsSketchActions, type GpsSketchReportDraft } from "@/features/home/hooks/useGpsSketchActions";
import { useGpsSketchTrackingSession } from "@/features/home/hooks/useGpsSketchTrackingSession";
import { useAppSettings } from "@/features/settings/hooks/useAppSettings";

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
import { ReportDetailsPage } from "@/features/report/pages/ReportDetails/ReportDetailsPage";
import { LogoutPage } from "@/features/auth/pages/Logout/LogoutPage";
import { CreateOrEditReportPage } from "@/features/report/pages/CreateOrEditReport/CreateOrEditReportPage";
import { NewReportPage } from "@/features/report/pages/NewReportChoice/NewReportPage";
import { FastReportGpsOverlay } from "@/features/report/components/FastReport/FastReportGpsOverlay";
import { FastReportThemePicker } from "@/features/report/components/FastReport/FastReportThemePicker";
import { useFastReportFlow } from "@/features/report/hooks/useFastReportFlow";
import { useFastReportThemes } from "@/features/report/hooks/useFastReportThemes";
import { AboutPage } from "@/features/about/pages/AboutPage";
import { HelpPage } from "@/features/help/pages/HelpPage";
import { MyCommunitiesSelectionPage } from "@/features/community/pages/MyCommunitiesSelection/MyCommunitiesSelectionPage";
import { OfflineManagementPage } from "@/features/offline/pages/OfflineManagementPage";
import { AboutCommunityPage } from "@/features/community/pages/AboutCommunity/AboutCommunityPage";
import { AboutReportsPage } from "@/features/report/pages/AboutReports/AboutReportsPage";

import { DirectContributionFeatureFormPage } from "@/features/map/pages/DirectContribution/DirectContributionFeatureFormPage";
import { DirectContributionFeatureDetailsPage } from "@/features/map/pages/DirectContribution/DirectContributionFeatureDetailsPage";

import { LayersPanelFlow } from "@/features/map/components/LayersPanelFlow";
import type { LayerGroupId } from "@/features/map/types/layerGroups";
import { useLayers } from "@/features/map/hooks/useLayers";
import { useCommunityMapLayers } from "@/features/map/hooks/useCommunityMapLayers";
import { useCommunityFeatureConsultation } from "@/features/map/hooks/useCommunityFeatureConsultation";
import { useDirectContributionLayers } from "@/features/map/hooks/useDirectContributionLayers";
import { useDirectContributionSession } from "@/features/map/hooks/useDirectContributionSession";
import { useOfflineRasterMapLayers } from "@/features/map/hooks/useOfflineRasterMapLayers";
import { useMountedCommunityVectorLayers } from "@/features/map/hooks/useMountedCommunityVectorLayers";
import { useSignalementMapLayers } from "@/features/map/hooks/useSignalementMapLayers";
import { useLocalReportFeatureConsultation } from "@/features/map/hooks/useLocalReportFeatureConsultation";
import { useMapLongPress, type MapLongPressCoordinate } from "@/features/map/hooks/useMapLongPress";
import { useUserLocationMarker } from "@/features/home/hooks/useUserLocationMarker";
import { DirectContributionMapOverlay } from "@/features/map/components/DirectContributionMapOverlay";
import { DirectContributionFeatureChoiceAlert } from "@/features/map/components/DirectContributionFeatureChoiceAlert";
import { DirectContributionConflictAlert } from "@/features/map/components/DirectContributionConflictAlert";
import { getCommunityLayerDirectContributionState } from "@/domain/community/directContribution";
import styles from "./HomePage.module.css";
import { overlayRoutes } from "@/app/router/routes";

import IconBurger from "@/shared/assets/icons/icon-burger.svg?react";
import IconSearch from "@/shared/assets/icons/icon-search.svg?react";
import IconGeolocation from "@/shared/assets/icons/icon-geolocation.svg?react";
import IconZoomIn from "@/shared/assets/icons/icon-plus.svg?react";
import IconZoomOut from "@/shared/assets/icons/icon-minus.svg?react";
import IconCompass from "@/shared/assets/icons/icon-compass.svg?react";
import IconPause from "@/shared/assets/icons/icon-pause.svg?react";
import IconPlay from "@/shared/assets/icons/icon-play.svg?react";

import { HomeLoadingOverlay } from '@/features/home/components/HomeLoadingOverlay';
import { MapNorthCompass } from '@/features/home/components/MapNorthCompass';
import { applyReportObjectMetadata, buildReportObjectKey } from '@/features/report/utils/reportObjects';
import { getCommunityLayerKey } from '@/shared/utils/layerKey';
import type { ReportType } from "@/domain/report/models";
import { GEOLOCATION_DOUBLE_TAP_DELAY_MS } from "@/shared/constants/map";
import { Loading } from "@/shared/ui/Loading";
import { Alert } from "@/shared/ui/Alert";
import { ActionSheet } from "@/shared/ui/ActionSheet";
import { createPositionFromLonLat } from "@/shared/utils/position";
import { openInMapApp } from "@/platform/device/appLauncher";
import type { Position } from "@/platform/device/geolocation";
import { EspaceCo_DeviceOrientation } from "@/platform/device/orientation";

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
  const { mapSettings, displayMode } = useAppSettings();
  const fastReportThemes = useFastReportThemes();
  const fastReportFlow = useFastReportFlow();
  const {
    mapElementRef,
    mapRef,
    map,
    centerOnUserLocation,
    lockUserLocationOnMap,
    isLockedUserLocation,
    isLocating,
    isMapReady,
    hasInitialCenterCompleted,
    userFollowingMode,
    setUserFollowingMode,
  } = useMap({
    centerOnUserLocation: offlineMode !== 'offline',
    skipGeoportailCapabilities: offlineMode === 'offline',
    isRotationEnabled: mapSettings.isRotationEnabled ?? false,
  });
  const {
    layers,
    geoportailLayers,
    vectorLayers,
    lockedByLayerKey,
    groupVisibility,
    geoportailLayerState,
    signalementLayerState,
    isLoading: isLayersLoading,
    setLayerVisibility,
    setLayerOpacity,
    setLayerStyle,
    setGroupLayerOrder,
    setLayerGroupVisibility,
    setLayerDirectContributionLock,
  } = useLayers(offlineMode, activeCommunityCache);
  useSignalementMapLayers(
    mapRef,
    signalementLayerState,
    groupVisibility.signalements,
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
    geoportailLayerState,
    groupVisibility,
    mountedVectorLayers,
    isMapReady,
    offlineMode,
    mapSettings.isOnlineVectorCacheEnabled,
    activeCommunityCache
  );
  useOfflineRasterMapLayers(mapRef, rasterMaps, isMapReady, offlineMode);
  useUserLocationMarker({ map, isMapReady });

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLayersPanelOpen, setIsLayersPanelOpen] = useState(false);
  const [isReportMapPickerActive, setIsReportMapPickerActive] = useState(false);
  const [initialLayerGroupId, setInitialLayerGroupId] = useState<LayerGroupId | null>(null);
  const [initialLayerGroupRequestKey, setInitialLayerGroupRequestKey] = useState(0);
  const [activeOverlay, setActiveOverlay] = useState<OverlayRoute | null>(null);
  const [offlineOverlayKey, setOfflineOverlayKey] = useState(0);
  const [newReportType, setReportType] = useState<ReportType>('standard');
  const [newReportInitialPosition, setNewReportInitialPosition] = useState<Position | null>(null);
  const [newReportInitialObjects, setNewReportInitialObjects] = useState<Feature<Geometry>[]>([]);
  const [newReportInitialSketches, setNewReportInitialSketches] = useState<Feature<Geometry>[]>([]);
  const [isNewReportThemePreselected, setIsNewReportThemePreselected] = useState(false);
  const [longPressMapAction, setLongPressMapAction] = useState<MapLongPressCoordinate | null>(null);
  const [isCommunitySwitchLoading, setIsCommunitySwitchLoading] = useState(false);
  const [hasObservedCommunitySwitchLoading, setHasObservedCommunitySwitchLoading] = useState(false);
  const geolocationTapTimeoutRef = useRef<number | null>(null);
  const geolocationLastTapRef = useRef(0);
  const isFastReportFlowActive = fastReportFlow.isActive;
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
      isReportMapPickerActive ||
      isFastReportFlowActive ||
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

  /**
   * A single tap centers the map. A second tap inside the delay toggles location lock.
   */
  const handleGeolocationButtonClick = (event: MouseEvent<HTMLButtonElement>) => {
    const now = event.timeStamp;

    void EspaceCo_DeviceOrientation.ensurePermissions();

    if (geolocationTapTimeoutRef.current !== null && now - geolocationLastTapRef.current <= GEOLOCATION_DOUBLE_TAP_DELAY_MS) {
      window.clearTimeout(geolocationTapTimeoutRef.current);
      geolocationTapTimeoutRef.current = null;
      lockUserLocationOnMap();
      return;
    }

    geolocationLastTapRef.current = now;
    geolocationTapTimeoutRef.current = window.setTimeout(() => {
      geolocationTapTimeoutRef.current = null;
      void centerOnUserLocation();
    }, GEOLOCATION_DOUBLE_TAP_DELAY_MS);
  };

  useEffect(() => {
    return () => {
      if (geolocationTapTimeoutRef.current !== null) {
        window.clearTimeout(geolocationTapTimeoutRef.current);
      }
    };
  }, []);

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
    setNewReportInitialPosition(null);
    setNewReportInitialObjects([]);
    setNewReportInitialSketches([]);
    setIsNewReportThemePreselected(false);
    setActiveOverlay(null);
    setIsSearchOpen(false);
    setTimeout(() => {
      setActiveOverlay('/create-or-edit-report');
    }, 300);
  };

  const handleNewReportTrace = () => {
    setReportType('trace');
    setNewReportInitialPosition(null);
    setNewReportInitialObjects([]);
    setNewReportInitialSketches([]);
    setIsNewReportThemePreselected(false);
    setActiveOverlay(null);
    setIsSearchOpen(false);
    setTimeout(() => {
      setActiveOverlay('/create-or-edit-report');
    }, 300);
  };

  const handleFastReportTabClick = () => {
    setActiveOverlay(null);
    setIsLayersPanelOpen(false);
    setIsSearchOpen(false);
    clearGpsSketchSelection();
    fastReportFlow.openFromTab();
  };

  const handleFastReportOther = () => {
    fastReportFlow.closeThemePicker();
    fastReportFlow.closeGps();
    handleNewReportStandard();
  };

  const handleSearchClick = () => {
    setIsSearchOpen((prev) => !prev);
  };

  const handleTabClick = (tab: TabId) => {
    if (tab === "couches" && !isLayersPanelOpen) {
      setInitialLayerGroupId(null);
      setIsLayersPanelOpen(true);
    }
    else if (tab === "signalement") {
      setActiveOverlay('/new-report-choice');
    }
    else if (tab === "guichet") {
      setActiveOverlay(null);
      setInitialLayerGroupId('guichet');
      setInitialLayerGroupRequestKey((value) => value + 1);
      setIsLayersPanelOpen(true);
    }
    else if (tab === "signalementRapide") {
      handleFastReportTabClick();
    }
  };

  const handleCloseLongPressMapAction = useCallback(() => {
    setLongPressMapAction(null);
  }, []);

  const handleCreateReportFromLongPress = () => {
    if (!longPressMapAction) return;

    setReportType('standard');
    setNewReportInitialPosition(
      createPositionFromLonLat(longPressMapAction.longitude, longPressMapAction.latitude)
    );
    setNewReportInitialObjects([]);
    setNewReportInitialSketches([]);
    setIsNewReportThemePreselected(true);
    setLongPressMapAction(null);
    setIsSearchOpen(false);
    setActiveOverlay('/create-or-edit-report');
  };

  const handleOpenLongPressInMapApp = async () => {
    if (!longPressMapAction) return;

    const { latitude, longitude } = longPressMapAction;
    setLongPressMapAction(null);
    try {
      await openInMapApp(latitude, longitude);
    } catch (error) {
      console.error('Failed to open map app', error);
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

  const handleReportConsultedFeature = () => {
    const candidate = consultedFeatureCandidate!;

    const layerKey = getCommunityLayerKey(candidate.layer);
    const feature = candidate.feature.clone();
    const featureId = candidate.feature.getId();
    if (featureId !== undefined) {
      feature.setId(featureId);
    }

    applyReportObjectMetadata(feature, {
      key: buildReportObjectKey(candidate.feature, layerKey),
      label: candidate.label,
      layerName: layerKey,
      layerTitle: candidate.layer.title,
    });

    setReportType('standard');
    setNewReportInitialPosition(null);
    setNewReportInitialObjects([feature]);
    setNewReportInitialSketches([]);
    setIsNewReportThemePreselected(true);
    closeConsultedFeatureDetails();
    setIsSearchOpen(false);
    setActiveOverlay('/create-or-edit-report');
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

  const shouldShowOnboarding = showOnboarding && !isHomeLoadingOverlayVisible;

  const {
    selectedReport: selectedLocalReport,
    closeReportDetails: closeLocalReportDetails,
  } = useLocalReportFeatureConsultation({
    map,
    disabled:
      isDirectContributionSessionActive ||
      isReportMapPickerActive ||
      isFastReportFlowActive ||
      activeConflict !== null ||
      activeOverlay !== null ||
      isLayersPanelOpen ||
      directContributionFeatureFormState !== null ||
      consultedFeatureCandidate !== null ||
      isDirectContributionFeatureChoiceOpen ||
      isConsultationFeatureChoiceOpen ||
      isHomeLoadingOverlayVisible ||
      shouldShowOnboarding,
  });

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

  const isGpsSketchSelectionEnabled =
    isMapReady &&
    userFollowingMode === 'none' &&
    activeOverlay === null &&
    !isLayersPanelOpen &&
    !isFastReportFlowActive &&
    !isDirectContributionSessionActive &&
    activeConflict === null &&
    directContributionFeatureFormState === null &&
    consultedFeatureCandidate === null &&
    selectedLocalReport === null &&
    !isDirectContributionFeatureChoiceOpen &&
    !isConsultationFeatureChoiceOpen &&
    !isHomeLoadingOverlayVisible &&
    !shouldShowOnboarding;

  const {
    isRecording: isGpsSketchRecording,
    isPaused: isGpsSketchPaused,
    selectedSketch: selectedGpsSketch,
    pointCount: gpsSketchPointCount,
    distanceMeters: gpsSketchDistanceMeters,
    startRecording: startGpsSketchRecording,
    togglePause: toggleGpsSketchPause,
    stopRecording: stopGpsSketchRecording,
    clearSelection: clearGpsSketchSelection,
  } = useGpsSketchTrackingSession({
    map,
    enabled: isMapReady,
    selectionEnabled: isGpsSketchSelectionEnabled,
  });

  const openReportFromGpsSketch = useCallback((draft: GpsSketchReportDraft) => {
    setReportType('standard');
    setNewReportInitialPosition(draft.position);
    setNewReportInitialObjects([]);
    setNewReportInitialSketches(draft.sketches);
    setIsNewReportThemePreselected(true);
    setActiveOverlay('/create-or-edit-report');
  }, []);

  const {
    isExporting: isGpsSketchExporting,
    createReportFromSketch,
    exportSketchAsGpx,
  } = useGpsSketchActions({
    map,
    selectedSketch: selectedGpsSketch,
    clearSelection: clearGpsSketchSelection,
    onCreateReport: openReportFromGpsSketch,
  });

  const handleUserFollowingButtonClick = () => {
    void EspaceCo_DeviceOrientation.ensurePermissions();
    setUserFollowingMode((mode) => {
      if (mode === 'tracking') {
        stopGpsSketchRecording();
        return 'none';
      }

      clearGpsSketchSelection();
      return 'tracking';
    });
  };

  const isMapLongPressEnabled =
    isMapReady &&
    activeOverlay === null &&
    !isLayersPanelOpen &&
    !isDirectContributionSessionActive &&
    !isFastReportFlowActive &&
    !isGpsSketchRecording &&
    selectedGpsSketch === null &&
    activeConflict === null &&
    directContributionFeatureFormState === null &&
    consultedFeatureCandidate === null &&
    selectedLocalReport === null &&
    !isDirectContributionFeatureChoiceOpen &&
    !isConsultationFeatureChoiceOpen &&
    !isHomeLoadingOverlayVisible &&
    !shouldShowOnboarding;

  useMapLongPress({
    map,
    enabled: isMapLongPressEnabled,
    onLongPress: setLongPressMapAction,
  });

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
        {mapSettings.isSearchEnabled && (
          <button
            className={`${styles.searchButton} ${isHighlighted("search") ? styles.highlighted : ""}`}
            onClick={handleSearchClick}
            aria-label="Search"
            data-onboarding-target="search"
          >
            <IconSearch className={styles.searchIcon} />
          </button>
        )}
      </header>

      <main className={styles.main}>
        <div className={styles.map} ref={mapElementRef} />
        <MapNorthCompass
          map={map}
          isMapReady={isMapReady}
          isRotationEnabled={mapSettings.isRotationEnabled ?? false}
        />
        <SearchPanel
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          map={map}
        />
      </main>

      {/* <p className={styles.copyright}>
				{t("home.copyright")}
			</p> */}

      {/* Zoom in/out buttons */}

      {mapSettings.isZoomEnabled && (
        <div className={styles.zoomButtonGroup}>
          <button
            type="button"
            className={styles.zoomInButton}
            onClick={() => map?.getView()?.setZoom((map?.getView()?.getZoom() ?? 0) + 1)}
            aria-label="Zoom in"
          >
            <IconZoomIn className={styles.zoomInIcon} />
          </button>

          <button
            type="button"
            className={styles.zoomOutButton}
            onClick={() => map?.getView()?.setZoom((map?.getView()?.getZoom() ?? 0) - 1)}
            aria-label="Zoom out"
          >
            <IconZoomOut className={styles.zoomOutIcon} />
          </button>
        </div>
      )}

      {/* Following user location button */}

      {
        displayMode !== 'beginner' && (
          <button
            className={`${styles.mapActionButton} ${styles.userFollowingButton} ${userFollowingMode === 'tracking' ? styles.locked : ""}`}
            onClick={handleUserFollowingButtonClick}
            disabled={isLocating && userFollowingMode === 'none'}
            aria-label="Follow my position"
            data-onboarding-target="userFollowing"
          >
            <IconCompass
              className={styles.userFollowingIcon}
            />
          </button>
        )
      }

      {displayMode !== 'beginner' && userFollowingMode === 'tracking' && (
        <div className={styles.gpsSketchControls}>
          <button
            type="button"
            className={`${styles.mapActionButton} ${styles.gpsSketchActionButton} ${isGpsSketchRecording && !isGpsSketchPaused ? styles.recording : ''}`}
            onClick={startGpsSketchRecording}
            disabled={isGpsSketchRecording}
            aria-label={t('home.gpsSketch.record')}
          >
            <span className={styles.gpsSketchRecordDot} />
          </button>

          {isGpsSketchRecording && (
            <button
              type="button"
              className={`${styles.mapActionButton} ${styles.gpsSketchActionButton} ${isGpsSketchPaused ? styles.recording : ''}`}
              onClick={toggleGpsSketchPause}
              aria-label={isGpsSketchPaused
                ? t('home.gpsSketch.resume')
                : t('home.gpsSketch.pause')}
            >
              {isGpsSketchPaused ? (
                <IconPlay className={styles.gpsSketchActionIcon} />
              ) : (
                <IconPause className={styles.gpsSketchActionIcon} />
              )}
            </button>
          )}
        </div>
      )}

      {/* Geolocation center button */}

      <button
        className={`${styles.mapActionButton} ${styles.geolocationButton} ${isHighlighted("geolocation") ? styles.highlighted : ""} ${isLockedUserLocation ? styles.locked : ""}`}
        onClick={handleGeolocationButtonClick}
        disabled={isLocating && userFollowingMode === 'none'}
        aria-label="Center on my position"
        data-onboarding-target="geolocation"
      >
        {
          !isLocating
            ? <IconGeolocation className={styles.geolocationIcon} />
            : <Loading size="small" className={styles.geolocationLoading} />
        }
      </button>

      <BottomTabbar
        onTabClick={handleTabClick}
        highlightedTab={getHighlightedTab()}
        activeTab={isFastReportFlowActive ? "signalementRapide" : isLayersPanelOpen ? "couches" : null}
      />

      <LayersPanelFlow
        isOpen={isLayersPanelOpen}
        onClose={() => setIsLayersPanelOpen(false)}
        initialLayerGroupId={initialLayerGroupId}
        initialLayerGroupRequestKey={initialLayerGroupRequestKey}
        layers={layers}
        geoportailLayers={geoportailLayers}
        vectorLayers={vectorLayers}
        groupVisibility={groupVisibility}
        geoportailLayerState={geoportailLayerState}
        lockedByLayerKey={lockedByLayerKey}
        signalementLayerState={signalementLayerState}
        pendingChangesCountByLayerKey={pendingChangesCountByLayerKey}
        submittingByLayerKey={submittingByLayerKey}
        isLoading={isLayersLoading}
        onSetLayerVisibility={setLayerVisibility}
        onSetLayerOpacity={setLayerOpacity}
        onSetLayerStyle={setLayerStyle}
        onSetGroupVisibility={setLayerGroupVisibility}
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
        onReport={handleReportConsultedFeature}
        onBack={
          consultationFeatureCandidates.length > 1
            ? goBackFromConsultedFeatureDetails
            : undefined
        }
        onClose={closeConsultedFeatureDetails}
      />

      <ReportDetailsPage
        isOpen={selectedLocalReport !== null}
        report={selectedLocalReport}
        onBack={closeLocalReportDetails}
        onClose={closeLocalReportDetails}
        map={map}
        vectorLayers={vectorLayers}
        onSearchPanelVisibilityChange={setIsSearchOpen}
        onMapPickerActiveChange={setIsReportMapPickerActive}
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

      <ActionSheet
        isOpen={longPressMapAction !== null}
        onClose={handleCloseLongPressMapAction}
        title={t('home.mapLongPressAction.title')}
        buttons={[
          {
            label: t('home.mapLongPressAction.createReport'),
            onClick: handleCreateReportFromLongPress,
          },
          {
            label: t('home.mapLongPressAction.goTo'),
            onClick: () => void handleOpenLongPressInMapApp(),
            variant: 'outline',
          },
        ]}
      />

      <Alert
        isOpen={selectedGpsSketch !== null}
        onClose={clearGpsSketchSelection}
        title={t('home.gpsSketch.selectionTitle')}
        subtitle={t('home.gpsSketch.selectionSubtitle', {
          count: gpsSketchPointCount,
          distance: gpsSketchDistanceMeters,
        })}
        buttons={[
          {
            label: t('home.gpsSketch.createReport'),
            onClick: createReportFromSketch,
          },
          {
            label: t('home.gpsSketch.exportGpx'),
            onClick: () => void exportSketchAsGpx(),
            variant: 'outline',
            loading: isGpsSketchExporting,
          },
        ]}
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

      <FastReportThemePicker
        isOpen={fastReportFlow.isThemePickerOpen}
        themes={fastReportThemes}
        onSelectTheme={fastReportFlow.openGps}
        onSelectOther={handleFastReportOther}
        onClose={fastReportFlow.closeThemePicker}
      />

      {map && fastReportFlow.selectedTheme && (
        <FastReportGpsOverlay
          isOpen={fastReportFlow.isGpsOpen}
          map={map}
          theme={fastReportFlow.selectedTheme}
          onClose={fastReportFlow.closeGps}
          onChooseTheme={fastReportFlow.chooseAnotherTheme}
        />
      )}

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
          map={map}
          vectorLayers={vectorLayers}
          onSearchPanelVisibilityChange={setIsSearchOpen}
          onMapPickerActiveChange={setIsReportMapPickerActive}
        />
      )}
      {activeOverlay === '/my-reports' && (
        <MyReportsPage
          isOpen
          onClose={handleCloseOverlay}
          map={map}
          vectorLayers={vectorLayers}
          onSearchPanelVisibilityChange={setIsSearchOpen}
          onMapPickerActiveChange={setIsReportMapPickerActive}
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
          initialPosition={newReportInitialPosition}
          initialObjects={newReportInitialObjects}
          initialSketches={newReportInitialSketches}
          preselectFirstTheme={isNewReportThemePreselected}
          map={map}
          vectorLayers={vectorLayers}
          onSearchPanelVisibilityChange={setIsSearchOpen}
          onMapPickerActiveChange={setIsReportMapPickerActive}
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
