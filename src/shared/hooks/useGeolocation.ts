import { useState, useEffect, useCallback } from 'react';
import { EspaceCo_Geolocation, type Position, type PositionOptions } from '@/platform/device/geolocation';

export interface UseGeolocationOptions {
	/* Fetch position on mount or not */
	fetchOnMount?: boolean;
	/* Capacitor position options */
	positionOptions?: PositionOptions;
}

export interface UseGeolocationReturn {
	position: Position | null;
	isLocating: boolean;
	error: string | null;
	fetchPosition: () => Promise<void>;
}

export function useGeolocation(options: UseGeolocationOptions = {}): UseGeolocationReturn {
	const { fetchOnMount = true, positionOptions } = options;

	const [position, setPosition] = useState<Position | null>(null);
	const [isLocating, setIsLocating] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetchPosition = useCallback(async () => {
		setIsLocating(true);
		setError(null);
		try {
			const result = await EspaceCo_Geolocation.getUsersLocation(positionOptions);
			if (result) {
				setPosition(result);
			} else {
				setError('permissionDenied');
			}
		} catch (err) {
			console.error('Error getting users location:', err);
			setError('error');
		} finally {
			setIsLocating(false);
		}
	}, [positionOptions]);

	useEffect(() => {
		if (fetchOnMount) {
			fetchPosition();
		}
	}, [fetchOnMount, fetchPosition]);

	return { position, isLocating, error, fetchPosition };
}
