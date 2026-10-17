import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import type { PlantTrendDataInput, PlantTrendItemInput, TrendQueryInput } from '../model';
import { trendsRepository } from './repository';

const TREND_STALE_TIME = 60_000;

export const trendQueryKeys = {
	all: ['trends'] as const,
	series: (input: TrendQueryInput) => [...trendQueryKeys.all, input] as const,
	/** Akar seluruh data tren satu PLTA; mengubah daftarnya menginvalidasi akar ini. */
	plantRoot: (pltaId: string) => [...trendQueryKeys.all, 'plta', pltaId] as const,
	plantList: (pltaId: string) => [...trendQueryKeys.plantRoot(pltaId), 'list'] as const,
	plantData: (input: PlantTrendDataInput) =>
		[
			...trendQueryKeys.plantRoot(input.pltaId),
			'data',
			input.from,
			input.to,
			input.resolution,
			input.itemIds ?? 'semua'
		] as const,
	catalog: (pltaId: string) => [...trendQueryKeys.plantRoot(pltaId), 'catalog'] as const
};

export function createTrendQuery(
	input: () => TrendQueryInput,
	enabled: () => boolean = () => true
) {
	return createQuery(() => {
		const value = input();

		return {
			queryKey: trendQueryKeys.series(value),
			queryFn: ({ signal }: { signal: AbortSignal }) =>
				trendsRepository.getSeries(value, { signal }),
			enabled: enabled() && Boolean(value.pltaId && value.parameter && value.from && value.to),
			staleTime: TREND_STALE_TIME,
			refetchOnWindowFocus: false
		};
	});
}

export function createPlantTrendListQuery(pltaId: () => string) {
	return createQuery(() => {
		const id = pltaId();

		return {
			queryKey: trendQueryKeys.plantList(id),
			queryFn: ({ signal }: { signal: AbortSignal }) =>
				trendsRepository.getPlantTrendList(id, { signal }),
			enabled: Boolean(id),
			staleTime: TREND_STALE_TIME,
			refetchOnWindowFocus: false
		};
	});
}

export function createPlantTrendDataQuery(
	input: () => PlantTrendDataInput,
	enabled: () => boolean = () => true
) {
	return createQuery(() => {
		const value = input();

		return {
			queryKey: trendQueryKeys.plantData(value),
			queryFn: ({ signal }: { signal: AbortSignal }) =>
				trendsRepository.getPlantTrendData(value, { signal }),
			enabled: enabled() && Boolean(value.pltaId && value.from && value.to),
			staleTime: TREND_STALE_TIME,
			refetchOnWindowFocus: false
		};
	});
}

export function createTrendCatalogQuery(pltaId: () => string, enabled: () => boolean) {
	return createQuery(() => {
		const id = pltaId();

		return {
			queryKey: trendQueryKeys.catalog(id),
			queryFn: ({ signal }: { signal: AbortSignal }) =>
				trendsRepository.getTrendCatalog(id, { signal }),
			enabled: Boolean(id) && enabled(),
			// Dibaca untuk disunting: `dipakai` harus mencerminkan daftar terbaru.
			staleTime: 0
		};
	});
}

export function createUpdatePlantTrendListMutation() {
	const queryClient = useQueryClient();

	return createMutation(() => ({
		mutationFn: ({ pltaId, items }: { pltaId: string; items: PlantTrendItemInput[] }) =>
			trendsRepository.updatePlantTrendList(pltaId, items),
		onSuccess: (list) => {
			queryClient.setQueryData(trendQueryKeys.plantList(list.pltaId), list);
			// Data grafik membawa susunan `grafik` dan label item; keduanya ikut berubah.
			void queryClient.invalidateQueries({ queryKey: trendQueryKeys.plantRoot(list.pltaId) });
		}
	}));
}
