import { useState, useEffect, useMemo, useCallback } from 'react';
import { useCommunity } from '@/features/community/hooks/useCommunity';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { CommunityLayer } from '@ign/mobile-core';
import {
	fetchCommunityLayers,
	filterGeoportailLayers,
	filterVectorLayers,
} from '@/infra/api/layerService';
import { getCommunityLayerKey } from '@/shared/utils/layerKey';
import {
	type SignalementLayerKey,
	type SignalementLayerOpacity,
	type SignalementLayerVisibility,
	SIGNAL_LAYER_KEYS,
	DEFAULT_SIGNALEMENT_LAYER_ORDER,
	DEFAULT_SIGNALEMENT_LAYER_VISIBILITY,
	isSignalementLayerKey,
	normalizeSignalementLayerOrder,
} from '@/features/map/types/signalementLayers';
import type { LayerGroupId } from '@/features/map/types/layerGroups';
import { clampNumber } from '@/shared/utils/number';
import {
	loadLayersConfiguration,
	saveLayersConfiguration,
} from '@/features/map/services/layersConfigurationStorage';
import {
	orderItemsByStringKey,
	uniqueOrderedStrings,
} from '@/features/map/utils/order';

const DEFAULT_SIGNALEMENT_LAYER_OPACITY: SignalementLayerOpacity = {
	[SIGNAL_LAYER_KEYS.mesSignalements]: 1,
	[SIGNAL_LAYER_KEYS.croquis]: 1,
	[SIGNAL_LAYER_KEYS.signalements]: 1,
};

function getDefaultSignalementLayerOpacity(): SignalementLayerOpacity {
	return { ...DEFAULT_SIGNALEMENT_LAYER_OPACITY };
}

function reorderLayersByLayerOrder(
	layers: CommunityLayer[],
	layerOrder: string[]
): CommunityLayer[] {
	const normalizedLayerOrder = uniqueOrderedStrings(layerOrder);
	if (normalizedLayerOrder.length === 0) {
		return layers;
	}

	return orderItemsByStringKey(layers, getCommunityLayerKey, normalizedLayerOrder);
}

function reorderLayersWithinSubset(
	layers: CommunityLayer[],
	orderedSubsetLayerKeys: string[]
): CommunityLayer[] {
	const normalizedSubsetOrder = uniqueOrderedStrings(orderedSubsetLayerKeys);
	if (normalizedSubsetOrder.length === 0) {
		return layers;
	}

	const subsetLayerKeySet = new Set(normalizedSubsetOrder);
	const subsetLayers = layers.filter((layer) =>
		subsetLayerKeySet.has(getCommunityLayerKey(layer))
	);
	const reorderedSubsetLayers = orderItemsByStringKey(
		subsetLayers,
		getCommunityLayerKey,
		normalizedSubsetOrder
	);

	let reorderedSubsetIndex = 0;

	return layers.map((layer) => {
		const layerKey = getCommunityLayerKey(layer);
		if (!subsetLayerKeySet.has(layerKey)) {
			return layer;
		}

		const reorderedLayer = reorderedSubsetLayers[reorderedSubsetIndex];
		reorderedSubsetIndex += 1;
		return reorderedLayer ?? layer;
	});
}

export function useLayers() {
	const { user } = useAuth();
	const { activeCommunity } = useCommunity();
	const activeCommunityId = activeCommunity?.id;
	const userId = user?.id ?? null;
	const [layers, setLayers] = useState<CommunityLayer[]>([]);
	const [signalementLayerVisibility, setSignalementLayerVisibility] =
		useState<SignalementLayerVisibility>(() => ({ ...DEFAULT_SIGNALEMENT_LAYER_VISIBILITY }));
	const [signalementLayerOpacity, setSignalementLayerOpacity] =
		useState<SignalementLayerOpacity>(() => getDefaultSignalementLayerOpacity());
	const [signalementLayerOrder, setSignalementLayerOrder] = useState<
		SignalementLayerKey[]
	>(() => [...DEFAULT_SIGNALEMENT_LAYER_ORDER]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [hydratedCommunityId, setHydratedCommunityId] = useState<number | null>(null);
	const [hydratedUserId, setHydratedUserId] = useState<number | null>(null);

	const resetLayerPreferences = useCallback(() => {
		setSignalementLayerVisibility({ ...DEFAULT_SIGNALEMENT_LAYER_VISIBILITY });
		setSignalementLayerOpacity(getDefaultSignalementLayerOpacity());
		setSignalementLayerOrder([...DEFAULT_SIGNALEMENT_LAYER_ORDER]);
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

	const setGroupLayerOrder = useCallback((
		groupId: LayerGroupId,
		orderedLayerKeys: string[]
	) => {
		if (groupId === 'signalements') {
			setSignalementLayerOrder(normalizeSignalementLayerOrder(orderedLayerKeys));
			return;
		}

		setLayers((previousLayers) =>
			reorderLayersWithinSubset(previousLayers, orderedLayerKeys)
		);
	}, []);

	const fetchLayers = useCallback(async (forceRefresh = false) => {
		setHydratedCommunityId(null);
		setHydratedUserId(null);

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

			const savedConfiguration = await loadLayersConfiguration(activeCommunityId, userId);

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
			const nextSignalementLayerOrder = normalizeSignalementLayerOrder(
				savedConfiguration?.signalementLayerOrder
			);
			const nextLayers = reorderLayersByLayerOrder(
				layersWithConfiguration,
				savedConfiguration?.layerOrder ?? []
			);

			setLayers(nextLayers);
			setSignalementLayerVisibility(nextSignalementLayerVisibility);
			setSignalementLayerOpacity(nextSignalementLayerOpacity);
			setSignalementLayerOrder(nextSignalementLayerOrder);
			setHydratedCommunityId(activeCommunityId);
			setHydratedUserId(userId);
		} catch (err) {
			console.error('Failed to fetch layers:', err);
			setError('Failed to fetch layers');
			setLayers([]);
			resetLayerPreferences();
		} finally {
			setIsLoading(false);
		}
	}, [activeCommunityId, resetLayerPreferences, userId]);

	useEffect(() => {
		fetchLayers();
	}, [fetchLayers]);

	useEffect(() => {
		if (
			!activeCommunityId ||
			hydratedCommunityId !== activeCommunityId ||
			hydratedUserId !== userId
		) {
			return;
		}

		void saveLayersConfiguration({
			communityId: activeCommunityId,
			userId,
			layers,
			signalementLayerVisibility,
			signalementLayerOpacity,
			signalementLayerOrder,
		});
	}, [
		activeCommunityId,
		hydratedCommunityId,
		hydratedUserId,
		layers,
		signalementLayerOpacity,
		signalementLayerOrder,
		signalementLayerVisibility,
		userId,
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
		signalementLayerOrder,
		isLoading,
		error,
		refetch: refetchLayers,
		setLayerVisibility,
		setLayerOpacity,
		setGroupLayerOrder,
	};
}
