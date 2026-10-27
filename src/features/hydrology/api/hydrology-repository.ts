import type {
	DailyExcelUploadOptions,
	DailyTemplateOptions,
	DailyLayoutChanges,
	DailyVisibility,
	LabelChanges,
	MonthlyFieldLabels,
	DailyHydrologyPanel,
	DailyHydrologyExcelResult,
	DailyHydrologyReportScope,
	HydrologyPeriod,
	MonthlyAccumulationChart,
	MonthlyReportScope,
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
	/** Seluruh metrik panel harian satu PLTA beserta status sembunyinya. */
	getDailyVisibility(pltaId: string, options?: HydrologyRequestOptions): Promise<DailyVisibility>;
	/**
	 * Mengubah tata letak panel harian: status sembunyi (`true` = sembunyikan)
	 * dan/atau urutan per panel. Atomik di server: satu kunci tak dikenal,
	 * kunci panel lain, atau kunci ganda menolak seluruh permintaan dan tidak
	 * ada yang tersimpan.
	 */
	setDailyVisibility(pltaId: string, changes: DailyLayoutChanges): Promise<DailyVisibility>;
	/** Nama metrik panel harian satu PLTA — khusus admin. */
	setDailyLabels(pltaId: string, labels: LabelChanges): Promise<DailyVisibility>;
	getMonthlyFieldLabels(options?: HydrologyRequestOptions): Promise<MonthlyFieldLabels>;
	/** Nama bidang bulanan — berlaku untuk SEMUA PLTA, khusus admin. */
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
	/** Ringkasan seluruh PLTA untuk satu periode atau rentang. `month` kosong = sepanjang tahun. */
	getMonthlyOverview(
		period: HydrologyPeriod,
		options?: HydrologyRequestOptions
	): Promise<MonthlyHydrologyOverview>;
	/**
	 * Target vs realisasi akumulasi per bulan. Setiap bulan dalam rentang muncul,
	 * yang belum diisi bernilai `null`. Tanpa `pltaId`: jumlah seluruh PLTA.
	 */
	getMonthlyChart(
		period: HydrologyPeriod,
		pltaId?: string,
		options?: HydrologyRequestOptions
	): Promise<MonthlyAccumulationChart>;
	/**
	 * Laporan Excel hidrologi bulanan: lembar DATA per (PLTA, bulan) dan lembar
	 * RINGKASAN rata-rata seluruh PLTA. Angkanya dihitung server dengan kode yang sama
	 * dengan ringkasan seluruh PLTA di layar.
	 */
	downloadMonthlyReport(scope: MonthlyReportScope): Promise<Blob>;
	/** Laporan Excel hidrologi harian, satu lembar per panel Hulu/Bendungan/Hilir. */
	downloadDailyReport(scope: DailyHydrologyReportScope): Promise<Blob>;
	/**
	 * Template harian: satu baris per (PLTA, tanggal), kolom diturunkan dari tag
	 * berprotokol `upload`, nilai tersimpan sudah dipra-isi. `to` kosong = hanya
	 * `from`; rentang maksimal 92 hari.
	 */
	downloadDailyTemplate(from: string, to?: string, options?: DailyTemplateOptions): Promise<Blob>;
	/** Impor nilai harian manual seluruh PLTA. Atomik, sel kosong dilewati. */
	uploadDailyExcel(
		file: File,
		options?: DailyExcelUploadOptions
	): Promise<DailyHydrologyExcelResult>;
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
