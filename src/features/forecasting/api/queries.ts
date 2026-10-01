import { createQuery } from '@tanstack/svelte-query';
import type { ForecastQueryInput } from '../model';
import { forecastingRepository } from './repository';

export const forecastQueryKeys = {
	all: ['forecasts'] as const,
	series: (input: ForecastQueryInput) => [...forecastQueryKeys.all, input] as const
};

/**
 * Hanya membaca hasil run terbaru. Run sendiri dijadwalkan backend setiap
 * 00.30 WIB; dashboard sengaja tidak punya jalur untuk memicu
 * `POST /forecasts/run` — membuka atau menyegarkan halaman tidak boleh
 * menjalankan model.
 */
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
