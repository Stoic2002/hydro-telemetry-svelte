import type {
	DailyHydrologyPanel,
	DailyHydrologyParams,
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
	/**
	 * Panel harian satu PLTA. `date` kosong berarti hari ini menurut WIB.
	 *
	 * Mengembalikan `dmnUnits` juga karena daftar unit datang di objek `plta`
	 * pada respons yang sama — pemilih penyebut tidak perlu panggilan kedua.
	 */
	getDaily(
		pltaId: string,
		params?: DailyHydrologyParams,
		options?: HydrologyRequestOptions
	): Promise<DailyHydrologyPanel>;
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
	/**
	 * Satu gambar berlaku untuk seluruh PLTA, jadi responsnya tidak berisi record
	 * bulanan satu PLTA — tidak ada `plta_id` tunggal yang bisa dikembalikan.
	 * Karena itu badan responsnya tidak dibaca sama sekali.
	 */
	uploadMonthlyImage(input: UploadMonthlyHydrologyImageInput): Promise<void>;
}
