import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { easeOut } from 'ol/easing';
import type Map from 'ol/Map';
import styles from './MapNorthCompass.module.css';

const ROTATION_EPSILON = 0.004;

function normalizeRotation(rotation: number): number {
	let r = rotation % (2 * Math.PI);
	if (r > Math.PI) {
		r -= 2 * Math.PI;
	}
	if (r < -Math.PI) {
		r += 2 * Math.PI;
	}
	return r;
}

interface MapNorthCompassProps {
	map: Map | null;
	isMapReady: boolean;
	isRotationEnabled: boolean;
}

export function MapNorthCompass({ map, isMapReady, isRotationEnabled }: MapNorthCompassProps) {
	const { t } = useTranslation();
	const [rotationRad, setRotationRad] = useState(0);

	useEffect(() => {
		if (!map || !isMapReady || !isRotationEnabled) {
			queueMicrotask(() => setRotationRad(0));
			return;
		}

		const view = map.getView();
		const onRotationChange = () => {
			setRotationRad(view.getRotation());
		};

		queueMicrotask(onRotationChange);
		view.on('change:rotation', onRotationChange);

		return () => {
			view.un('change:rotation', onRotationChange);
		};
	}, [map, isMapReady, isRotationEnabled]);

	const handleReset = useCallback(() => {
		if (!map) {
			return;
		}
		map.getView().animate({
			rotation: 0,
			duration: 280,
			easing: easeOut,
		});
	}, [map]);

	if (!isRotationEnabled || !map || !isMapReady) {
		return null;
	}

	const normalized = normalizeRotation(rotationRad);
	if (Math.abs(normalized) < ROTATION_EPSILON) {
		return null;
	}

	return (
		<button
			type="button"
			className={styles.compassButton}
			onClick={handleReset}
			aria-label={t('home.resetMapNorth')}
		>
			<span className={styles.needle} style={{ transform: `rotate(${rotationRad}rad)` }}>
				<span className={styles.diamond} />
			</span>
		</button>
	);
}
