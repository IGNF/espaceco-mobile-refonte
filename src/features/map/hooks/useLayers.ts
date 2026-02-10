import { useState, useEffect, useCallback } from "react";
import { useCommunity } from "@/features/community/hooks/useCommunity";
import type { CommunityLayer } from "@/domain/community/models";
import {
	fetchCommunityLayers,
	filterGeoportailLayers,
	filterVectorLayers,
} from "@/infra/api/layerService";

export function useLayers() {
	const { activeCommunity } = useCommunity();
	const [layers, setLayers] = useState<CommunityLayer[]>([]);
	const [geoportailLayers, setGeoportailLayers] = useState<CommunityLayer[]>([]);
	const [vectorLayers, setVectorLayers] = useState<CommunityLayer[]>([]);
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
			const enrichedLayers = await fetchCommunityLayers(activeCommunity.id);
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
