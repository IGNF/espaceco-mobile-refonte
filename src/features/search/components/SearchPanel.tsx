import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import type Map from "ol/Map";
import { useSearchGeoportail } from "../hooks/useSearchGeoportail";
import type { SearchMode } from "../types";
import styles from "./SearchPanel.module.css";
import inputStyles from "@/shared/ui/Input/Input.module.css";

import IconClose from "@/shared/assets/icons/icon-close.svg?react";

export interface SearchPanelProps {
	isOpen: boolean;
	onClose: () => void;
	map: Map | null;
}

export function SearchPanel({ isOpen, onClose, map }: SearchPanelProps) {
	const { t } = useTranslation();
	const [mode, setMode] = useState<SearchMode>("address");
	const addressContainerRef = useRef<HTMLDivElement>(null);
	const parcelleContainerRef = useRef<HTMLDivElement>(null);

	const { clearMarker } = useSearchGeoportail({
		map,
		addressContainerRef,
		parcelleContainerRef,
		isOpen,
	});

	const handleClose = () => {
		clearMarker();
		onClose();
	};

	if (!isOpen) return null;

	return (
		<div className={styles.panel}>
			<div className={styles.header}>
				<div className={styles.radioGroup}>
					<label className={inputStyles.radioLabel}>
						<input
							type="radio"
							name="searchMode"
							value="address"
							checked={mode === "address"}
							onChange={() => setMode("address")}
							className={inputStyles.radioInput}
						/>
						<span className={inputStyles.radioCircle} />
						<span>{t("search.modeAddress")}</span>
					</label>
					<label className={inputStyles.radioLabel}>
						<input
							type="radio"
							name="searchMode"
							value="parcelle"
							checked={mode === "parcelle"}
							onChange={() => setMode("parcelle")}
							className={inputStyles.radioInput}
						/>
						<span className={inputStyles.radioCircle} />
						<span>{t("search.modeParcelle")}</span>
					</label>
				</div>
				<button
					className={styles.closeButton}
					onClick={handleClose}
					aria-label={t("search.close")}
				>
					<IconClose className={styles.closeIcon} />
				</button>
			</div>
			<div
				ref={addressContainerRef}
				className={styles.searchContainer}
				style={{ display: mode === "address" ? "block" : "none" }}
			/>
			<div
				ref={parcelleContainerRef}
				className={styles.searchContainer}
				style={{ display: mode === "parcelle" ? "block" : "none" }}
			/>
		</div>
	);
}
