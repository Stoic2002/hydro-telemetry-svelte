import { createQuery } from '@tanstack/svelte-query';
import { alignTrendRange, trendsRepository } from '$features/trends';
import {
	RAIN_GAUGE_STALE_MINUTES,
	rainGauges,
	summarizeMeasuredRain,
	type MeasuredRain
} from '../rainfall';
import { monitoringRepository } from './repository';

const MONITORING_STALE_TIME = 15_000;
/** Penakar mengirim tiap jam, sesekali lebih cepat saat hujan. */
const MEASURED_RAIN_REFRESH_MS = 5 * 60 * 1_000;

export const monitoringQueryKeys = {
	all: ['monitoring'] as const,
	latest: () => [...monitoringQueryKeys.all, 'latest'] as const,
	pltaLatest: (pltaId: string) => [...monitoringQueryKeys.latest(), 'plta', pltaId] as const,
	riverBasinLatest: (wsId: string) =>
		[...monitoringQueryKeys.latest(), 'river-basin', wsId] as const,
	measuredRain: (wsIds: string[]) => [...monitoringQueryKeys.all, 'measured-rain', wsIds] as const
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

async function fetchMeasuredRain(wsIds: string[], signal: AbortSignal): Promise<MeasuredRain[]> {
	const now = Date.now();
	const snapshots = (
		await Promise.all(
			wsIds.map((wsId) => monitoringRepository.getLatestByRiverBasin(wsId, { signal }))
		)
	).flat();
	// Diambil sepanjang ambang basi, bukan hanya jendela hujan: pembacaan di sini
	// yang membuktikan penakar masih mengirim, karena snapshot monitoring bisa
	// tertinggal (lihat `rainfall.ts`).
	const window = alignTrendRange(new Date(now), RAIN_GAUGE_STALE_MINUTES * 60_000, '5m');

	const summaries = await Promise.all(
		snapshots.map(async (snapshot) => {
			const gauges = rainGauges(snapshot.parameters);
			if (gauges.length === 0) return null;

			// Per stasiun, bukan agregat: tanpa `station`, /trends merata-ratakan
			// seluruh stasiun dan hujan lebat di satu stasiun tenggelam oleh tiga
			// stasiun lain yang kering. Station kosong dikirim apa adanya — `''`
			// berarti stasiun tanpa nama, bukan "semua stasiun".
			const stations = await Promise.all(
				gauges.map(async (gauge) => {
					const series = await trendsRepository.getSeries(
						{
							pltaId: snapshot.pltaId,
							parameter: 'rainfall',
							...window,
							resolution: 'raw',
							station: gauge.station,
							aggregation: 'avg'
						},
						{ signal }
					);

					return {
						station: gauge.station,
						latestTime: gauge.time,
						readings: series.points.map(({ time, value }) => ({ time, value }))
					};
				})
			);

			return summarizeMeasuredRain(snapshot.pltaId, stations, now);
		})
	);

	return summaries.filter((summary): summary is MeasuredRain => summary !== null);
}

/**
 * Hujan terukur untuk seluruh PLTA dalam Wilayah Sungai yang diberikan. PLTA
 * tanpa penakar hujan tidak ikut dalam hasilnya.
 */
export function createMeasuredRainQuery(
	wsIds: () => string[],
	enabled: () => boolean = () => true
) {
	return createQuery(() => {
		const ids = [...new Set(wsIds())].sort();

		return {
			queryKey: monitoringQueryKeys.measuredRain(ids),
			queryFn: ({ signal }: { signal: AbortSignal }) => fetchMeasuredRain(ids, signal),
			enabled: enabled() && ids.length > 0,
			staleTime: MEASURED_RAIN_REFRESH_MS,
			refetchInterval: MEASURED_RAIN_REFRESH_MS,
			refetchOnWindowFocus: false
		};
	});
}
