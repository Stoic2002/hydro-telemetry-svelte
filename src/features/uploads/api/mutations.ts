import { createMutation } from '@tanstack/svelte-query';
import type { UploadElevationExcelInput } from '../model';
import { uploadsRepository } from './repository';

export function createUploadElevationExcelMutation() {
	return createMutation(() => ({
		mutationFn: (input: UploadElevationExcelInput) => uploadsRepository.uploadElevationExcel(input)
	}));
}
