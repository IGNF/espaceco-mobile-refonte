import { useState, useEffect, useMemo, useCallback } from 'react';
import { useCommunity } from '@/features/community/hooks/useCommunity';
import type { CommunityLayer } from '@ign/mobile-core';
import {
	fetchCommunityLayers,
	filterGeoportailLayers,
	filterVectorLayers,
} from '@/infra/api/layerService';
import { getCommunityLayerKey } from '@/shared/utils/layerKey';

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
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const geoportailLayers = useMemo(() => filterGeoportailLayers(layers), [layers]);
	const vectorLayers = useMemo(() => filterVectorLayers(layers), [layers]);

	const setLayerVisibility = useCallback((layerKey: string, visible: boolean) => {
		setLayers((previous) => updateLayerVisibility(previous, layerKey, visible));
	}, []);

	const fetchLayers = useCallback(async () => {
		if (!activeCommunity) {
			setLayers([]);
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			const enrichedLayers = await fetchCommunityLayers(activeCommunity.id);

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

	return {
		layers,
		geoportailLayers,
		vectorLayers,
		isLoading,
		error,
		refetch: fetchLayers,
		setLayerVisibility,
	};
}
