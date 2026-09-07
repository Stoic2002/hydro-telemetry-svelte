import { createQuery } from '@tanstack/svelte-query';
import { monitoringRepository } from './repository';

const MONITORING_STALE_TIME = 15_000;

export const monitoringQueryKeys = {
	all: ['monitoring'] as const,
	latest: () => [...monitoringQueryKeys.all, 'latest'] as const,
	pltaLatest: (pltaId: string) => [...monitoringQueryKeys.latest(), 'plta', pltaId] as const,
	riverBasinLatest: (wsId: string) =>
		[...monitoringQueryKeys.latest(), 'river-basin', wsId] as const
};

export function createPLTALatestQuery(pltaId: () => string, enabled: () => boolean = () => true) {
	return createQuery(() => {
		const id = pltaId();

		return {
			queryKey: monitoringQueryKeys.pltaLatest(id),
			queryFn: ({ signal }: { signal: AbortSignal }) =>
				monitoringRepository.getLatestByPLTA(id, { signal }),
			enabled: enabled() && Boolean(id),
			staleTime: MONITORING_STALE_TIME,
			refetchOnWindowFocus: false
		};
	});
}

export function createRiverBasinLatestQuery(
	wsId: () => string,
	enabled: () => boolean = () => true
) {
	return createQuery(() => {
		const id = wsId();

		return {
			queryKey: monitoringQueryKeys.riverBasinLatest(id),
			queryFn: ({ signal }: { signal: AbortSignal }) =>
				monitoringRepository.getLatestByRiverBasin(id, { signal }),
			enabled: enabled() && Boolean(id),
			staleTime: MONITORING_STALE_TIME,
			refetchOnWindowFocus: false
		};
	});
}
