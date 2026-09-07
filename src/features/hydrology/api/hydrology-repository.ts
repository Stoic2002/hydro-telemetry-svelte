import type {
	DailyHydrology,
	MonthlyHydrology,
	MonthlyHydrologyExcelResult,
	MonthlyHydrologyImageKind,
	UpsertMonthlyHydrologyInput,
	UploadMonthlyHydrologyImageInput
} from '../model';

export interface HydrologyRequestOptions {
	signal?: AbortSignal;
}

export interface HydrologyRepository {
	/** Panel harian satu PLTA. `date` kosong berarti hari ini menurut WIB. */
	getDaily(
		pltaId: string,
		date?: string,
		options?: HydrologyRequestOptions
	): Promise<DailyHydrology | null>;
	/** Panel satu bulan. Bulan yang belum diisi tetap balik dengan `id` null. */
	getMonthlyPanel(
		pltaId: string,
		year: number,
		month: number,
		options?: HydrologyRequestOptions
	): Promise<MonthlyHydrology | null>;
	listMonthly(
		pltaId: string,
		year: number,
		options?: HydrologyRequestOptions
	): Promise<MonthlyHydrology[]>;
	/** Gambar prakiraan hujan berlaku lintas-PLTA, jadi tidak ter-scope `pltaId`. */
	getMonthlyImage(
		year: number,
		month: number,
		kind: MonthlyHydrologyImageKind,
		options?: HydrologyRequestOptions
	): Promise<Blob>;
	/**
	 * Template Excel berisi satu baris per PLTA untuk satu periode, sudah
	 * dipra-isi nilai yang tersimpan sehingga operator mengoreksi, bukan
	 * mengetik ulang.
	 */
	downloadMonthlyTemplate(
		year: number,
		month: number,
		options?: HydrologyRequestOptions
	): Promise<Blob>;
	/** Impor satu berkas untuk seluruh PLTA sekaligus. Bersifat atomik. */
	uploadMonthlyExcel(file: File): Promise<MonthlyHydrologyExcelResult>;
	upsertMonthly(input: UpsertMonthlyHydrologyInput): Promise<MonthlyHydrology>;
	uploadMonthlyImage(input: UploadMonthlyHydrologyImageInput): Promise<MonthlyHydrology>;
}
