import type { ElevationUploadResult, UploadElevationExcelInput } from '../model';

export interface UploadsRequestOptions {
	signal?: AbortSignal;
}

export interface UploadsRepository {
	/**
	 * Template kurva Elevasi-Volume-Area, sudah dipra-isi titik yang tersimpan
	 * untuk PLTA dan tahun itu — operator mengoreksi, bukan mengetik ulang.
	 */
	downloadElevationTemplate(
		pltaId: string,
		year: number,
		options?: UploadsRequestOptions
	): Promise<Blob>;
	uploadElevationExcel(input: UploadElevationExcelInput): Promise<ElevationUploadResult>;
}
