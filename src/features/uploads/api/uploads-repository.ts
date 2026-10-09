import type {
	ElevationCurveStatus,
	ElevationCurveSummary,
	ElevationStatusOverview,
	ElevationUploadResult,
	UploadElevationExcelInput
} from '../model';

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
	/** Kesiapan kurva tiap PLTA, dinilai dengan aturan kurva berlaku untuk `year`. */
	getElevationStatus(
		year: number,
		options?: UploadsRequestOptions
	): Promise<ElevationStatusOverview>;
	/** Kurva tanpa titik, terbaru dulu. `pltaId` kosong = seluruh PLTA. */
	listElevationCurves(
		params: { pltaId?: string; year: number },
		options?: UploadsRequestOptions
	): Promise<ElevationCurveSummary[]>;
	/**
	 * `draft` ↔ `published`. Hanya published yang dipakai perhitungan volume.
	 * Publish ditolak `409` bila titiknya identik dengan kurva PLTA lain.
	 */
	setElevationCurveStatus(curveId: string, status: ElevationCurveStatus): Promise<void>;
	/** Hanya draft; published ditolak `409`. Tidak dapat dibatalkan, tercatat di jejak audit. */
	deleteElevationCurve(curveId: string): Promise<void>;
}
