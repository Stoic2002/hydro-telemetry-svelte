import { createMutation, useQueryClient } from '@tanstack/svelte-query';
import { invalidateUploadAudit } from '../../audit/api/queries';
import type { UploadElevationExcelInput } from '../model';
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
		onSuccess: () => invalidateUploadAudit(queryClient)
	}));
}
