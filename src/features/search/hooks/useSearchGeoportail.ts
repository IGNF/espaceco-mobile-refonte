import { useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";

import type Map from "ol/Map";
import Overlay from "ol/Overlay";
import SearchGeoportail from "ol-ext/control/SearchGeoportail";
import type { Options as SearchGeoportailOptions } from "ol-ext/control/SearchGeoportail";
import SearchGeoportailParcelle from "ol-ext/control/SearchGeoportailParcelle";
import type { Options as SearchGeoportailParcelleOptions } from "ol-ext/control/SearchGeoportailParcelle";
import type { SearchEvent } from "ol-ext/control/Search";
import "ol-ext/control/Search.css";

import { DEFAULT_MAP_SEARCH_ZOOM, GEOPORTAIL_API_KEY } from "@/shared/constants/map";

interface UseSearchGeoportailOptions {
  map: Map | null;
  addressContainerRef: React.RefObject<HTMLDivElement | null>;
  parcelleContainerRef: React.RefObject<HTMLDivElement | null>;
  isOpen: boolean;
}

export interface UseSearchGeoportailReturn {
  clearMarker: () => void;
}

interface SearchControlLike {
  element?: HTMLElement;
  set?: (key: string, value: unknown) => void;
  clearHistory?: () => void;
}

interface ParcelleControlLike extends SearchControlLike {
  addEventListener: (
    type: string,
    listener: (event?: Event & { coordinate?: number[] }) => void
  ) => void;
}

/**
 * Disables built-in search history for an ol-ext search control.
 */
function disableSearchHistory(control: SearchControlLike) {
  control.set?.("maxHistory", -1);
  control.clearHistory?.();
}

/**
 * Clears an autocomplete list and hides it if it exists.
 */
function clearAutocompleteList(container: HTMLElement | null, selector: string) {
  const list = container?.querySelector<HTMLUListElement>(selector);
  if (!list) return;
  list.innerHTML = "";
  list.style.display = "none";
}

/**
 * Toggles CSS state used to show/hide the arrondissement field in parcelle mode.
 */
function syncParcelleDistrictState(parcelleRoot: HTMLElement | null) {
  if (!parcelleRoot) return;
  const districtInput = parcelleRoot.querySelector("input.district") as HTMLInputElement | null;
  const hasDistrict = Boolean(districtInput && !districtInput.disabled);
  parcelleRoot.classList.toggle("parcelle-with-district", hasDistrict);
}

/**
 * Enhances parcelle pagination:
 * - displays 1-based page labels
 * - switches visible rows when a page is clicked
 * - keeps page/list visibility in sync with content
 */
function enhanceParcellePagination(parcelleRoot: HTMLElement | null) {
  if (!parcelleRoot) {
    return () => { };
  }

  const pageList = parcelleRoot.querySelector<HTMLUListElement>("ul.autocomplete-page");
  const parcelList = parcelleRoot.querySelector<HTMLUListElement>("ul.autocomplete-parcelle");
  if (!pageList || !parcelList) {
    return () => { };
  }

  const getPageIndex = (item: HTMLLIElement) => {
    if (!item.dataset.pageIndex) {
      const value = item.textContent?.trim() ?? "";
      if (/^\d+$/.test(value)) {
        item.dataset.pageIndex = value;
      }
    }

    const pageIndex = Number(item.dataset.pageIndex);
    return Number.isFinite(pageIndex) ? pageIndex : null;
  };

  const showPage = (pageIndex: number) => {
    const pageClassName = `ol-list-${pageIndex}`;
    let visibleSuggestionCount = 0;
    const parcelItems = Array.from(parcelList.querySelectorAll<HTMLLIElement>("li"));

    for (const item of parcelItems) {
      if (!item.dataset.pageIndex) {
        const className = Array.from(item.classList).find(c => c.startsWith("ol-list-"));
        if (className) {
          item.dataset.pageIndex = className.replace("ol-list-", "");
        }
      }

      const hasContent = (item.textContent?.trim().length ?? 0) > 0;
      if (!hasContent) {
        item.style.display = "none";
        continue;
      }

      const isVisible = item.classList.contains(pageClassName);
      item.style.display = isVisible ? "" : "none";
      if (isVisible) {
        visibleSuggestionCount += 1;
      }
    }

    const pageItems = Array.from(pageList.querySelectorAll<HTMLLIElement>("li"));
    for (const item of pageItems) {
      const itemPageIndex = getPageIndex(item);
      if (itemPageIndex === null) continue;
      item.classList.toggle("selected", itemPageIndex === pageIndex);
    }

    parcelList.style.display = visibleSuggestionCount > 0 ? "block" : "none";
  };

  const relabelPagination = () => {
    const pageItems = Array.from(pageList.querySelectorAll<HTMLLIElement>("li"));
    const validPageItems: HTMLLIElement[] = [];
    let validPageCount = 0;
    for (const item of pageItems) {
      const pageIndex = getPageIndex(item);
      if (pageIndex === null) {
        item.style.display = "none";
        continue;
      }

      validPageCount += 1;
      validPageItems.push(item);
      item.style.display = "";
      const pageLabel = String(pageIndex + 1);
      if (item.textContent !== pageLabel) {
        item.textContent = pageLabel;
      }
    }

    if (validPageItems.length === 0) {
      parcelList.style.display = "none";
      pageList.style.display = "none";
      return;
    }

    const selectedPageItem = validPageItems.find(item => item.classList.contains("selected")) ?? validPageItems[0];
    const selectedPageIndex = getPageIndex(selectedPageItem) ?? 0;
    showPage(selectedPageIndex);
    pageList.style.display = validPageCount > 1 ? "flex" : "none";
  };

  const handlePageClick = (event: Event) => {
    const target = (event.target as HTMLElement).closest("li");
    if (!target || !pageList.contains(target)) return;

    const pageIndex = getPageIndex(target as HTMLLIElement);
    if (pageIndex === null) return;

    event.preventDefault();
    event.stopPropagation();
    showPage(pageIndex);
  };

  pageList.addEventListener("click", handlePageClick, true);
  const pageObserver = new MutationObserver(relabelPagination);
  pageObserver.observe(pageList, { childList: true, subtree: true });
  const parcelObserver = new MutationObserver(relabelPagination);
  parcelObserver.observe(parcelList, { childList: true, subtree: true });
  relabelPagination();

  return () => {
    pageList.removeEventListener("click", handlePageClick, true);
    pageObserver.disconnect();
    parcelObserver.disconnect();
  };
}

/**
 * Mounts and configures address/parcelle Geoportail controls on the map,
 * plus marker and cleanup management.
 */
export function useSearchGeoportail({
  map,
  addressContainerRef,
  parcelleContainerRef,
  isOpen,
}: UseSearchGeoportailOptions): UseSearchGeoportailReturn {
  const { t } = useTranslation();
  const overlayRef = useRef<Overlay | null>(null);

  /**
   * Removes the temporary search marker overlay from the map.
   */
  const clearMarker = useCallback(() => {
    if (overlayRef.current && map) {
      map.removeOverlay(overlayRef.current);
      overlayRef.current.getElement()?.remove();
      overlayRef.current = null;
    }
  }, [map]);

  /**
   * Places a marker on the map at the selected coordinate and recenters the view.
   */
  const showMarkerAtCoordinate = useCallback(
    (coordinate: number[]) => {
      if (!map) return;

      // Remove previous marker
      clearMarker();

      // Create pulsing marker element
      const markerEl = document.createElement("div");
      markerEl.className = "search-marker-pulse";

      const overlay = new Overlay({
        element: markerEl,
        position: coordinate,
        positioning: "center-center",
        stopEvent: false,
      });

      overlayRef.current = overlay;
      map.addOverlay(overlay);

      // Center map on result
      map.getView().animate({
        center: coordinate,
        zoom: Math.max(map.getView().getZoom() ?? DEFAULT_MAP_SEARCH_ZOOM, DEFAULT_MAP_SEARCH_ZOOM),
        duration: 500,
      });
    },
    [map, clearMarker],
  );

  useEffect(() => {
    if (!map || !isOpen) return;
    if (!addressContainerRef.current || !parcelleContainerRef.current) return;

    const addressOptions: SearchGeoportailOptions = {
      target: addressContainerRef.current,
      apiKey: GEOPORTAIL_API_KEY,
      placeholder: t("search.addressPlaceholder"),
      collapsed: false,
      noCollapse: true,
      maxHistory: -1,
    };
    (addressOptions as Record<string, unknown>).type = "StreetAddress,PositionOfInterest";

    const addressSearch = new SearchGeoportail(addressOptions);
    addressSearch.setMap(map);
    const addressControl = addressSearch as unknown as SearchControlLike;
    disableSearchHistory(addressControl);

    addressSearch.on("select", (e: SearchEvent) => {
      if (e.coordinate) {
        showMarkerAtCoordinate(e.coordinate);
      }
      // Clear autocomplete list after selection
      clearAutocompleteList(addressContainerRef.current, "ul.autocomplete");
    });

    const parcelleOptions: SearchGeoportailParcelleOptions = {
      target: parcelleContainerRef.current,
      apiKey: GEOPORTAIL_API_KEY,
      placeholder: t("search.parcelle.communePlaceholder"),
      collapsed: false,
      noCollapse: true,
      maxHistory: -1,
      typing: 300,
    };
    const parcelleOptionsRecord = parcelleOptions as Record<string, unknown>;
    parcelleOptionsRecord.arrondLabel = t("search.parcelle.districtLabel");
    parcelleOptionsRecord.prefixLabel = t("search.parcelle.prefixLabel");
    parcelleOptionsRecord.sectionLabel = t("search.parcelle.sectionLabel");
    parcelleOptionsRecord.numberLabel = t("search.parcelle.numberLabel");
    parcelleOptionsRecord.pageSize = 5;

    const parcelleSearch = new SearchGeoportailParcelle(parcelleOptions);
    parcelleSearch.setMap(map);
    const parcelleControl = parcelleSearch as unknown as ParcelleControlLike;
    disableSearchHistory(parcelleControl);

    const parcelleRoot = parcelleControl.element ?? null;
    syncParcelleDistrictState(parcelleRoot);
    const detachPaginationEnhancement = enhanceParcellePagination(parcelleRoot);
    const districtInput = parcelleRoot?.querySelector("input.district") as HTMLInputElement | null;
    const districtObserver = districtInput
      ? new MutationObserver(() => syncParcelleDistrictState(parcelleRoot))
      : null;
    districtObserver?.observe(districtInput as Node, {
      attributes: true,
      attributeFilter: ["disabled"],
    });

    parcelleControl.addEventListener("parcelle", (event) => {
      if (event?.coordinate) {
        showMarkerAtCoordinate(event.coordinate);
      }
      const container = parcelleContainerRef.current;
      clearAutocompleteList(container, "ul.autocomplete-parcelle");
      clearAutocompleteList(container, "ul.autocomplete-page");
    });
    parcelleControl.addEventListener("commune", () => syncParcelleDistrictState(parcelleRoot));

    return () => {
      detachPaginationEnhancement();
      districtObserver?.disconnect();
      // Cleanup controls
      addressSearch.setMap(null as unknown as Map);
      parcelleSearch.setMap(null as unknown as Map);

      // Cleanup marker
      clearMarker();
    };
  }, [map, isOpen, addressContainerRef, parcelleContainerRef, showMarkerAtCoordinate, clearMarker, t]);

  return { clearMarker };
}
