import type {
	DailyHydrologyPanel,
	DailyHydrologyExcelResult,
	DailyHydrologyReportScope,
	HydrologyReportScope,
	MonthlyHydrologyOverview,
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
	/** Ringkasan seluruh PLTA. `month` kosong = sepanjang tahun. */
	getMonthlyOverview(
		year: number,
		month: number | undefined,
		options?: HydrologyRequestOptions
	): Promise<MonthlyHydrologyOverview>;
	/**
	 * Laporan Excel hidrologi bulanan: lembar DATA per (PLTA, bulan) dan lembar
	 * RINGKASAN rata-rata armada. Angkanya dihitung server dengan kode yang sama
	 * dengan ringkasan armada di layar.
	 */
	downloadMonthlyReport(scope: HydrologyReportScope): Promise<Blob>;
	/** Laporan Excel hidrologi harian, satu lembar per panel Hulu/Bendungan/Hilir. */
	downloadDailyReport(scope: DailyHydrologyReportScope): Promise<Blob>;
	/**
	 * Template harian: satu baris per (PLTA, tanggal), kolom diturunkan dari tag
	 * berprotokol `upload`, nilai tersimpan sudah dipra-isi. `to` kosong = hanya
	 * `from`; rentang maksimal 92 hari.
	 */
	downloadDailyTemplate(from: string, to?: string): Promise<Blob>;
	/** Impor nilai harian manual seluruh PLTA. Atomik, sel kosong dilewati. */
	uploadDailyExcel(file: File): Promise<DailyHydrologyExcelResult>;
	/** Impor satu berkas untuk seluruh PLTA sekaligus. Bersifat atomik. */
	uploadMonthlyExcel(file: File): Promise<MonthlyHydrologyExcelResult>;
	upsertMonthly(input: UpsertMonthlyHydrologyInput): Promise<MonthlyHydrology>;
	/**
	 * Satu gambar berlaku untuk seluruh PLTA, jadi responsnya tidak berisi record
	 * bulanan satu PLTA — tidak ada `plta_id` tunggal yang bisa dikembalikan.
	 * Karena itu badan responsnya tidak dibaca sama sekali.
	 */
	uploadMonthlyImage(input: UploadMonthlyHydrologyImageInput): Promise<void>;
	/**
	 * Menghapus satu gambar `(tahun, bulan, jenis)` untuk SELURUH PLTA — untuk
	 * gambar salah unggah yang penggantinya belum tersedia. Tidak dapat
	 * dibatalkan; server mencatatnya di jejak audit. `404` bila memang belum ada.
	 */
	deleteMonthlyImage(year: number, month: number, kind: MonthlyHydrologyImageKind): Promise<void>;
}
