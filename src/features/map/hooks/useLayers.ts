import { useState, useEffect, useCallback } from "react";
import { useCommunity } from "@/features/community/hooks/useCommunity";
import type { EnrichedCommunityLayer } from "@/domain/community/models";
import {
	fetchEnrichedCommunityLayers,
	filterGeoportailLayers,
	filterVectorLayers,
} from "@/infra/api/layerService";

export function useLayers() {
	const { activeCommunity } = useCommunity();
	const [layers, setLayers] = useState<EnrichedCommunityLayer[]>([]);
	const [geoportailLayers, setGeoportailLayers] = useState<EnrichedCommunityLayer[]>([]);
	const [vectorLayers, setVectorLayers] = useState<EnrichedCommunityLayer[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetchLayers = useCallback(async () => {
		if (!activeCommunity) {
			setLayers([]);
			setGeoportailLayers([]);
			setVectorLayers([]);
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			const enrichedLayers = await fetchEnrichedCommunityLayers(activeCommunity.id);
			const communityGeoportailLayers = filterGeoportailLayers(enrichedLayers);
			const communityVectorLayers = filterVectorLayers(enrichedLayers);

			setLayers([...communityGeoportailLayers, ...communityVectorLayers]);
			setGeoportailLayers(communityGeoportailLayers);
			setVectorLayers(communityVectorLayers);
		} catch (err) {
			console.error("Failed to fetch layers:", err);
			setError("Failed to fetch layers");
			setLayers([]);
			setGeoportailLayers([]);
			setVectorLayers([]);
		} finally {
			setIsLoading(false);
		}
	}, [activeCommunity]);

	useEffect(() => {
		fetchLayers();
	}, [fetchLayers]);

	return { layers, geoportailLayers, vectorLayers, isLoading, error, refetch: fetchLayers };
}
