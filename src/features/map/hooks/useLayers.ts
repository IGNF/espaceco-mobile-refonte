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
	type SignalementLayerKey,
	type SignalementLayerVisibility,
	DEFAULT_SIGNALEMENT_LAYER_VISIBILITY,
} from '@/features/map/types/signalementLayers';

function applyLayerVisibility(layer: CommunityLayer, visible: boolean): CommunityLayer {
	return {
		...layer,
		visible,
	} as CommunityLayer;
}

function updateLayerVisibility(
	collection: CommunityLayer[],
	layerKey: string,
	visible: boolean
): CommunityLayer[] {
	return collection.map((layer) =>
		getCommunityLayerKey(layer) === layerKey
			? applyLayerVisibility(layer, visible)
			: layer
	);
}

export function useLayers() {
	const { activeCommunity } = useCommunity();
	const [layers, setLayers] = useState<CommunityLayer[]>([]);
	const [signalementLayerVisibility, setSignalementLayerVisibility] =
		useState<SignalementLayerVisibility>(() => ({ ...DEFAULT_SIGNALEMENT_LAYER_VISIBILITY }));
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const geoportailLayers = useMemo(() => filterGeoportailLayers(layers), [layers]);
	const vectorLayers = useMemo(() => filterVectorLayers(layers), [layers]);

	const setLayerVisibility = useCallback((layerKey: string, visible: boolean) => {
		const isSignalementLayer =
			Object.prototype.hasOwnProperty.call(DEFAULT_SIGNALEMENT_LAYER_VISIBILITY, layerKey);
		if (isSignalementLayer) {
			const signalementKey = layerKey as SignalementLayerKey;
			setSignalementLayerVisibility((previous) => ({
				...previous,
				[signalementKey]: visible,
			}));
			return;
		}

		setLayers((previous) => updateLayerVisibility(previous, layerKey, visible));
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
		isLoading,
		error,
		refetch: refetchLayers,
		setLayerVisibility,
	};
}
