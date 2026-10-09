import { createQuery, type QueryClient } from '@tanstack/svelte-query';
import { invalidateUploadAudit } from '../../audit/api/queries';
import { hydrologyQueryKeys } from '../../hydrology/api/queries';
import { uploadsRepository } from './repository';

export const elevationQueryKeys = {
	all: ['elevations'] as const,
	status: (year: number) => [...elevationQueryKeys.all, 'status', year] as const,
	curves: (pltaId: string, year: number) =>
		[...elevationQueryKeys.all, 'curves', pltaId, year] as const
};

/**
 * Setiap perubahan kurva (unggah, publish, draft, hapus) menggeser status
 * kesiapan, daftar kurva, dan jejak audit. Publish atau penurunan ke draft
 * juga mengubah volume waduk dan seluruh turunannya di Hidrologi Harian,
 * jadi cache hidrologi ikut disegarkan.
 */
export async function invalidateElevationCurves(queryClient: QueryClient): Promise<void> {
	await Promise.all([
		queryClient.invalidateQueries({ queryKey: elevationQueryKeys.all }),
		queryClient.invalidateQueries({ queryKey: hydrologyQueryKeys.all }),
		invalidateUploadAudit(queryClient)
	]);
}

export function createElevationStatusQuery(year: () => number) {
	return createQuery(() => {
		const value = year();

		return {
			queryKey: elevationQueryKeys.status(value),
			queryFn: ({ signal }: { signal: AbortSignal }) =>
				uploadsRepository.getElevationStatus(value, { signal }),
			staleTime: 30_000
		};
	});
}

export function createElevationCurvesQuery(pltaId: () => string, year: () => number) {
	return createQuery(() => {
		const id = pltaId();
		const value = year();

		return {
			queryKey: elevationQueryKeys.curves(id, value),
			queryFn: ({ signal }: { signal: AbortSignal }) =>
				uploadsRepository.listElevationCurves({ pltaId: id, year: value }, { signal }),
			enabled: Boolean(id),
			staleTime: 30_000
		};
	});
}
