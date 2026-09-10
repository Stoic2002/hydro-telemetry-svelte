import { createMutation, useQueryClient } from '@tanstack/svelte-query';
import { invalidateUploadAudit } from '../../audit/api/queries';
import { hydrologyQueryKeys } from '../../hydrology/api/queries';
import type { UploadTelemetryExcelInput, UploadTelemetryPointsInput } from '../model';
import { telemetryUploadRepository } from './repository';

/**
 * Unggahan telemetri mengubah angka yang tampil di dashboard hidrologi PLTA
 * bersangkutan, jadi cache dashboard-nya ikut dibuang setelah unggahan berhasil.
 */
function refreshHydrologyDashboard(queryClient: ReturnType<typeof useQueryClient>) {
	return async (pltaId: string) => {
		await queryClient.invalidateQueries({
			queryKey: hydrologyQueryKeys.dashboardRoot(pltaId)
		});
		await invalidateUploadAudit(queryClient);
	};
}

export function createUploadTelemetryPointsMutation() {
	const refreshDashboard = refreshHydrologyDashboard(useQueryClient());

	return createMutation(() => ({
		mutationFn: (input: UploadTelemetryPointsInput) =>
			telemetryUploadRepository.uploadPoints(input),
		onSuccess: async (result) => refreshDashboard(result.pltaId)
	}));
}

export function createUploadTelemetryExcelMutation() {
	const refreshDashboard = refreshHydrologyDashboard(useQueryClient());

	return createMutation(() => ({
		mutationFn: (input: UploadTelemetryExcelInput) => telemetryUploadRepository.uploadExcel(input),
		onSuccess: async (result) => refreshDashboard(result.pltaId)
	}));
}
