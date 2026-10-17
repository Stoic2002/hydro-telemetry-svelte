import { createMutation, useQueryClient } from '@tanstack/svelte-query';
import { invalidateUploadAudit } from '../../audit/api/queries';
import { hydrologyQueryKeys } from '../../hydrology/api/queries';
import { monitoringQueryKeys } from '../../monitoring/api/queries';
import { trendQueryKeys } from '../../trends/api/queries';
import type {
	DeleteTelemetryPointsInput,
	DownloadTelemetryTemplateInput,
	UploadTelemetryExcelInput,
	UploadTelemetryPointsInput
} from '../model';
import { telemetryUploadRepository } from './repository';

/**
 * Unggahan maupun penghapusan data manual mengubah angka yang tampil di
 * dashboard hidrologi, nilai terbaru monitoring, dan grafik tren PLTA
 * bersangkutan, jadi cache ketiganya ikut dibuang setelah berhasil.
 */
function refreshHydrologyDashboard(queryClient: ReturnType<typeof useQueryClient>) {
	return async (pltaId: string) => {
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: hydrologyQueryKeys.dashboardRoot(pltaId) }),
			queryClient.invalidateQueries({ queryKey: monitoringQueryKeys.latest() }),
			queryClient.invalidateQueries({ queryKey: trendQueryKeys.plantRoot(pltaId) }),
			invalidateUploadAudit(queryClient)
		]);
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

export function createDeleteTelemetryPointsMutation() {
	const refreshDashboard = refreshHydrologyDashboard(useQueryClient());
	return createMutation(() => ({
		mutationFn: (input: DeleteTelemetryPointsInput) =>
			telemetryUploadRepository.deletePoints(input),
		onSuccess: async (result) => refreshDashboard(result.pltaId)
	}));
}

export function createDownloadTelemetryTemplateMutation() {
	return createMutation(() => ({
		mutationFn: (input: DownloadTelemetryTemplateInput) =>
			telemetryUploadRepository.downloadTemplate(input)
	}));
}
