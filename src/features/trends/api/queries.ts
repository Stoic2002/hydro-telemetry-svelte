import { createQuery } from '@tanstack/svelte-query';
import type { TrendQueryInput } from '../model';
import { trendsRepository } from './repository';

const TREND_STALE_TIME = 60_000;

export const trendQueryKeys = {
	all: ['trends'] as const,
	series: (input: TrendQueryInput) => [...trendQueryKeys.all, input] as const
};

export function createTrendQuery(input: () => TrendQueryInput) {
	return createQuery(() => {
		const value = input();

		return {
			queryKey: trendQueryKeys.series(value),
			queryFn: ({ signal }: { signal: AbortSignal }) =>
				trendsRepository.getSeries(value, { signal }),
			enabled: Boolean(value.pltaId && value.parameter && value.from && value.to),
			staleTime: TREND_STALE_TIME,
			refetchOnWindowFocus: false
		};
	});
}
