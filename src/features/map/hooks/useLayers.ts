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
import {
	loadLayersConfiguration,
	saveLayersConfiguration,
} from '@/features/map/services/layersConfigurationStorage';

const DEFAULT_SIGNALEMENT_LAYER_OPACITY: SignalementLayerOpacity = {
	[SIGNAL_LAYER_KEYS.mesSignalements]: 1,
	[SIGNAL_LAYER_KEYS.croquis]: 1,
	[SIGNAL_LAYER_KEYS.signalements]: 1,
};

function isSignalementLayerKey(layerKey: string): layerKey is SignalementLayerKey {
	return layerKey in DEFAULT_SIGNALEMENT_LAYER_VISIBILITY;
}

function getDefaultSignalementLayerOpacity(): SignalementLayerOpacity {
	return { ...DEFAULT_SIGNALEMENT_LAYER_OPACITY };
}

export function useLayers() {
	const { activeCommunity } = useCommunity();
	const activeCommunityId = activeCommunity?.id;
	const [layers, setLayers] = useState<CommunityLayer[]>([]);
	const [signalementLayerVisibility, setSignalementLayerVisibility] =
		useState<SignalementLayerVisibility>(() => ({ ...DEFAULT_SIGNALEMENT_LAYER_VISIBILITY }));
	const [signalementLayerOpacity, setSignalementLayerOpacity] =
		useState<SignalementLayerOpacity>(() => getDefaultSignalementLayerOpacity());
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [hydratedCommunityId, setHydratedCommunityId] = useState<number | null>(null);

	const resetLayerPreferences = useCallback(() => {
		setSignalementLayerVisibility({ ...DEFAULT_SIGNALEMENT_LAYER_VISIBILITY });
		setSignalementLayerOpacity(getDefaultSignalementLayerOpacity());
	}, []);

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
		setHydratedCommunityId(null);

		if (!activeCommunityId) {
			setLayers([]);
			resetLayerPreferences();
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			const enrichedLayers = await fetchCommunityLayers(activeCommunityId, {
				forceRefresh,
			});

			const savedConfiguration = await loadLayersConfiguration(activeCommunityId);

			const layersWithConfiguration = enrichedLayers.map((layer) => {
				const layerKey = getCommunityLayerKey(layer);
				const savedLayerState = savedConfiguration?.layersByKey[layerKey];
				if (!savedLayerState) {
					return layer;
				}

				return {
					...layer,
					visible: savedLayerState.visible ?? layer.visible,
					opacity: savedLayerState.opacity ?? layer.opacity,
				};
			});

			const nextSignalementLayerVisibility: SignalementLayerVisibility = {
				...DEFAULT_SIGNALEMENT_LAYER_VISIBILITY,
				...savedConfiguration?.signalementLayerVisibility,
			};
			const nextSignalementLayerOpacity: SignalementLayerOpacity = {
				...DEFAULT_SIGNALEMENT_LAYER_OPACITY,
				...savedConfiguration?.signalementLayerOpacity,
			};

			setLayers(layersWithConfiguration);
			setSignalementLayerVisibility(nextSignalementLayerVisibility);
			setSignalementLayerOpacity(nextSignalementLayerOpacity);
			setHydratedCommunityId(activeCommunityId);
		} catch (err) {
			console.error('Failed to fetch layers:', err);
			setError('Failed to fetch layers');
			setLayers([]);
			resetLayerPreferences();
		} finally {
			setIsLoading(false);
		}
	}, [activeCommunityId, resetLayerPreferences]);

	useEffect(() => {
		fetchLayers();
	}, [fetchLayers]);

	useEffect(() => {
		if (!activeCommunityId || hydratedCommunityId !== activeCommunityId) {
			return;
		}

		void saveLayersConfiguration({
			communityId: activeCommunityId,
			layers,
			signalementLayerVisibility,
			signalementLayerOpacity,
		});
	}, [
		activeCommunityId,
		hydratedCommunityId,
		layers,
		signalementLayerOpacity,
		signalementLayerVisibility,
	]);

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
