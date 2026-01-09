import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Map from "ol/Map";
import View from "ol/View";
import { defaults as defaultControls } from "ol/control";
import ScaleLine from "ol/control/ScaleLine";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import { fromLonLat } from "ol/proj";
import "ol/ol.css";
import { BottomTabbar, type TabId } from "@/app/components/BottomTabbar";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { Button } from "@/shared/ui/Button";
import styles from "./HomePage.module.css";

import IconBurger from "@/shared/assets/icons/icon-burger.svg?react";
import IconSearch from "@/shared/assets/icons/icon-search.svg?react";
import IconGeolocation from "@/shared/assets/icons/icon-geolocation.svg?react";
import {
	DEFAULT_MAP_CENTER_LON_LAT,
	DEFAULT_MAP_FOCUS_ZOOM,
	DEFAULT_MAP_SHOW_SCALELINE,
	DEFAULT_MAP_ZOOM,
} from "@/shared/constants/map";


export function HomePage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { logout } = useAuth();
	const mapElementRef = useRef<HTMLDivElement | null>(null);
	const mapRef = useRef<Map | null>(null);

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

	const centerMap = () => {
		const map = mapRef.current;
		if (!map) {
			return;
		}

		map.getView().setCenter(fromLonLat(DEFAULT_MAP_CENTER_LON_LAT));
		map.getView().setZoom(DEFAULT_MAP_FOCUS_ZOOM);
	};

	useEffect(() => {
		if (!mapElementRef.current || mapRef.current) {
			return;
		}

		mapRef.current = new Map({
			target: mapElementRef.current,
			layers: [
				new TileLayer({
					source: new OSM(),
				}),
			],
			controls: defaultControls({ zoom: false }).extend(
				DEFAULT_MAP_SHOW_SCALELINE ? [new ScaleLine()] : []
			),
			view: new View({
				center: fromLonLat(DEFAULT_MAP_CENTER_LON_LAT),
				zoom: DEFAULT_MAP_ZOOM,
			}),
		});

		return () => {
			mapRef.current?.setTarget(undefined);
			mapRef.current = null;
		};
	}, []);

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

			<Button
				className={styles.logoutButton}
				color="danger"
				variant="solid"
				onClick={handleLogout}
			>
				{t("home.logout")}
			</Button>

			<main className={styles.main}>
				<div className={styles.map} ref={mapElementRef} />
			</main>

      <p className={styles.copyright}>
        {t("home.copyright")}
      </p>

			<button
				className={styles.geolocationButton}
				onClick={centerMap}
				aria-label="Center on my position"
			>
				<IconGeolocation className={styles.geolocationIcon} />
			</button>

			<BottomTabbar onTabClick={handleTabClick} />
		</div>
	);
}
