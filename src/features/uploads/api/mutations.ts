import { createMutation, useQueryClient } from '@tanstack/svelte-query';
import type { ElevationCurveStatus, UploadElevationExcelInput } from '../model';
import { invalidateElevationCurves } from './queries';
import { uploadsRepository } from './repository';

export function createDownloadElevationTemplateMutation() {
	return createMutation(() => ({
		mutationFn: ({ pltaId, year }: { pltaId: string; year: number }) =>
			uploadsRepository.downloadElevationTemplate(pltaId, year)
	}));
}

export function createUploadElevationExcelMutation() {
	const queryClient = useQueryClient();

	return createMutation(() => ({
		mutationFn: (input: UploadElevationExcelInput) => uploadsRepository.uploadElevationExcel(input),
		onSuccess: () => invalidateElevationCurves(queryClient)
	}));
}

export function createSetElevationCurveStatusMutation() {
	const queryClient = useQueryClient();

	return createMutation(() => ({
		mutationFn: ({ curveId, status }: { curveId: string; status: ElevationCurveStatus }) =>
			uploadsRepository.setElevationCurveStatus(curveId, status),
		onSuccess: () => invalidateElevationCurves(queryClient)
	}));
}

export function createDeleteElevationCurveMutation() {
	const queryClient = useQueryClient();

	return createMutation(() => ({
		mutationFn: (curveId: string) => uploadsRepository.deleteElevationCurve(curveId),
		onSuccess: () => invalidateElevationCurves(queryClient)
	}));
}
