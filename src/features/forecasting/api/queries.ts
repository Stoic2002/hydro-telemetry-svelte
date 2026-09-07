import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import type { ForecastQueryInput } from '../model';
import { forecastingRepository } from './repository';

export const forecastQueryKeys = {
	all: ['forecasts'] as const,
	series: (input: ForecastQueryInput) => [...forecastQueryKeys.all, input] as const
};

export function createForecastQuery(input: () => ForecastQueryInput) {
	return createQuery(() => {
		const value = input();

		return {
			queryKey: forecastQueryKeys.series(value),
			queryFn: ({ signal }: { signal: AbortSignal }) =>
				forecastingRepository.getLatest(value, { signal }),
			enabled: Boolean(value.pltaId),
			staleTime: 60_000,
			refetchOnWindowFocus: false
		};
	});
}

export function createRunForecastMutation() {
	const queryClient = useQueryClient();

	return createMutation(() => ({
		mutationFn: (input: ForecastQueryInput) => forecastingRepository.run(input),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: forecastQueryKeys.all })
	}));
}
