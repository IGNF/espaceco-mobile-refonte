import { useState, useEffect, useMemo, useCallback } from 'react';
import { useCommunity } from '@/features/community/hooks/useCommunity';
import type { CommunityLayer } from '@ign/mobile-core';
import {
	fetchCommunityLayers,
	filterGeoportailLayers,
	filterVectorLayers,
} from '@/infra/api/layerService';
import { getCommunityLayerKey } from '@/shared/utils/layerKey';
import {
	type SignalementLayerOpacity,
	type SignalementLayerKey,
	type SignalementLayerVisibility,
	SIGNAL_LAYER_KEYS,
	DEFAULT_SIGNALEMENT_LAYER_VISIBILITY,
} from '@/features/map/types/signalementLayers';
import { clampNumber } from '@/shared/utils/number';

function isSignalementLayerKey(layerKey: string): layerKey is SignalementLayerKey {
	return layerKey in DEFAULT_SIGNALEMENT_LAYER_VISIBILITY;
}

export function useLayers() {
	const { activeCommunity } = useCommunity();
	const [layers, setLayers] = useState<CommunityLayer[]>([]);
	const [signalementLayerVisibility, setSignalementLayerVisibility] =
		useState<SignalementLayerVisibility>(() => ({ ...DEFAULT_SIGNALEMENT_LAYER_VISIBILITY }));
	const [signalementLayerOpacity, setSignalementLayerOpacity] =
		useState<SignalementLayerOpacity>(() => ({
			[SIGNAL_LAYER_KEYS.mesSignalements]: 1,
			[SIGNAL_LAYER_KEYS.croquis]: 1,
			[SIGNAL_LAYER_KEYS.signalements]: 1,
		}));
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const geoportailLayers = useMemo(() => filterGeoportailLayers(layers), [layers]);
	const vectorLayers = useMemo(() => filterVectorLayers(layers), [layers]);

	const setLayerVisibility = useCallback((layerKey: string, visible: boolean) => {
		if (isSignalementLayerKey(layerKey)) {
			setSignalementLayerVisibility((previous) => ({
				...previous,
				[layerKey]: visible,
			}));
			return;
		}

		setLayers((previous) =>
			previous.map((layer) =>
				getCommunityLayerKey(layer) === layerKey ? { ...layer, visible } : layer
			)
		);
	}, []);

	const setLayerOpacity = useCallback((layerKey: string, opacity: number) => {
		const nextOpacity = clampNumber(opacity, 0, 1);

		if (isSignalementLayerKey(layerKey)) {
			setSignalementLayerOpacity((previous) => ({
				...previous,
				[layerKey]: nextOpacity,
			}));
			return;
		}

		setLayers((previous) =>
			previous.map((layer) =>
				getCommunityLayerKey(layer) === layerKey
					? { ...layer, opacity: nextOpacity }
					: layer
			)
		);
	}, []);

	const fetchLayers = useCallback(async (forceRefresh = false) => {
		if (!activeCommunity) {
			setLayers([]);
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			const enrichedLayers = await fetchCommunityLayers(activeCommunity.id, {
				forceRefresh,
			});

			setLayers(enrichedLayers);
		} catch (err) {
			console.error('Failed to fetch layers:', err);
			setError('Failed to fetch layers');
			setLayers([]);
		} finally {
			setIsLoading(false);
		}
	}, [activeCommunity]);

	useEffect(() => {
		fetchLayers();
	}, [fetchLayers]);

	const refetchLayers = useCallback(async () => {
		await fetchLayers(true);
	}, [fetchLayers]);

	return {
		layers,
		geoportailLayers,
		vectorLayers,
		signalementLayerVisibility,
		signalementLayerOpacity,
		isLoading,
		error,
		refetch: refetchLayers,
		setLayerVisibility,
		setLayerOpacity,
	};
}
