export type NullableMetric = number | null;

export type DashboardMetricSource = 'measured' | 'derived' | 'plan' | 'constant';

/** Tujuan isian manual sebuah metrik. `null` bila baris itu tidak bisa diisi. */
export interface DashboardMetricInput {
	parameter: string;
	station: string;
}

export interface DashboardStationMetric {
	station: string;
	label: string;
	value: NullableMetric;
	time: string | null;
	/** Tujuan isian stasiun ini sendiri, mis. pintu spillway G1. */
	input: DashboardMetricInput | null;
}

export interface DashboardMetric {
	value: NullableMetric;
	/** Diisi server; `null` berarti baris ini tidak punya jalur isian manual. */
	input: DashboardMetricInput | null;
	unit: string | null;
	label: string;
	time: string | null;
	source: DashboardMetricSource;
	stations: DashboardStationMetric[] | null;
	/** `true` = disembunyikan operator untuk PLTA ini; tidak boleh dirender. */
	hidden: boolean;
	/**
	 * Posisi di panelnya (0 = teratas) menurut pengaturan PLTA ini. `null` bila
	 * server tidak mengirimnya; layar lalu memakai urutan bawaannya sendiri.
	 */
	order: number | null;
	/**
	 * Hanya dibawa metrik penyebut (`dmn_beban_penuh`), bukan seluruh metrik —
	 * karena itu opsional. `unit` bila dihitung dari unit terpilih, `manual`
	 * bila operator mengisi DMN sendiri.
	 */
	mode?: string | null;
	/** Nomor unit yang ikut dihitung saat `mode` = `unit`. */
	units?: number[] | null;
}

export type DashboardMetricGroup = Record<string, DashboardMetric>;

export interface DmnUnit {
	unit: number;
	dmnMw: number;
}

/**
 * Penyebut DMN untuk Service Hour Full Load dan metrik "thd target".
 *
 * Keduanya saling meniadakan — `dmnMw` menang di server bila diisi. Operator
 * biasanya cukup memilih unit; `dmnMw` untuk kasus DMN nyata tidak sama dengan
 * penjumlahan unit, mis. derating atau hasil uji kinerja.
 */
export interface DailyHydrologyParams {
	date?: string;
	units?: number[];
	dmnMw?: number;
}

export interface DailyHydrologyPanel {
	daily: DailyHydrology | null;
	/** Dari objek `plta`, tetap ada walau `daily` kosong. */
	dmnUnits: DmnUnit[];
}

export interface DailyHydrology {
	date: string;
	constants: Record<string, unknown> | null;
	upstream: DashboardMetricGroup;
	dam: DashboardMetricGroup;
	downstream: DashboardMetricGroup;
	pendingFormulas: string[];
}

/**
 * Empat gambar peta BMKG per bulan. Prediksi = prakiraan BMKG; realisasi =
 * analisis BMKG sesudah bulannya berjalan.
 */
export type MonthlyHydrologyImageKind =
	| 'prediksi_sifat_hujan'
	| 'prediksi_curah_hujan'
	| 'realisasi_sifat_hujan'
	| 'realisasi_curah_hujan';

/** `null` = server belum bisa menilai (prediksi atau targetnya kosong). */
export type AchievementStatus = 'achieved' | 'not-achieved' | null;

export interface MonthlyAchievement {
	/** Prediksi ÷ target × 100, dihitung server. */
	percentage: NullableMetric;
	status: AchievementStatus;
}

export interface MonthlyHydrology {
	id: string | null;
	pltaId: string;
	year: number;
	month: number;
	hydrologyPrediction: string | null;
	hydrologyActual: string | null;
	/** Path gambar per jenis; terisi bila gambarnya sudah diunggah. */
	images: Record<MonthlyHydrologyImageKind, string | null>;
	/** Energi bulan berjalan: prediksi ketersediaan energi primer, target, realisasi. */
	predictedProductionMwh: NullableMetric;
	targetProductionMwh: NullableMetric;
	actualProductionMwh: NullableMetric;
	/** Akumulasi: prediksi, target, dan realisasi. */
	predictedAccumulatedMwh: NullableMetric;
	targetAccumulatedMwh: NullableMetric;
	actualAccumulatedMwh: NullableMetric;
	/** Pasangan bulan berjalan: prediksi produksi ÷ target produksi. */
	monthlyAchievement: MonthlyAchievement;
	/** Pasangan akumulasi: prediksi akumulasi ÷ target akumulasi. */
	accumulatedAchievement: MonthlyAchievement;
}

export interface OverviewAverage {
	value: number | null;
	/** Jumlah data yang ikut dihitung — rata-rata atas sedikit data bukan angka gabungan. */
	count: number;
}

/**
 * Satu blok pencapaian overview. Dua persentase sengaja disimpan terpisah:
 * `aggregatePercent` (total prediksi ÷ total target) adalah angka gabungan
 * sesungguhnya, sedangkan `averagePercent` memberi bobot sama pada PLTA 1 MW
 * dan 179 MW.
 */
export interface OverviewAchievement {
	averagePercent: OverviewAverage;
	aggregatePercent: number | null;
	totalPredictedMwh: number;
	totalTargetMwh: number;
	achievedCount: number;
	notAchievedCount: number;
	/** Data yang prediksi/targetnya belum diisi. Bukan "tidak tercapai". */
	unassessedCount: number;
	/**
	 * Bulan pertama/terakhir yang dirangkum, `YYYY-MM`; `null` bila server tidak
	 * menyebutnya. Blok akumulasi = satu bulan (yang terakhir berdata), jadi
	 * awal = akhir, walau periode yang diminta sebuah rentang.
	 */
	periodStart: string | null;
	periodEnd: string | null;
}

/** Keenam angka energi yang dirata-ratakan overview. */
export type OverviewAverageKey =
	| 'predictedProductionMwh'
	| 'targetProductionMwh'
	| 'actualProductionMwh'
	| 'predictedAccumulatedMwh'
	| 'targetAccumulatedMwh'
	| 'actualAccumulatedMwh';

/**
 * Ringkasan hidrologi bulanan SELURUH PLTA untuk satu periode, dalam dua blok
 * berbentuk sama: `monthly` (produksi bulan berjalan) dan `accumulated`
 * (akumulasi).
 */
export interface MonthlyHydrologyOverview {
	year: number;
	/** `null` = sepanjang tahun. */
	month: number | null;
	rowCount: number;
	plantCount: number;
	monthly: OverviewAchievement;
	accumulated: OverviewAchievement;
	averages: Record<OverviewAverageKey, OverviewAverage>;
}

/**
 * Periode hidrologi bulanan. Aturan rentang mengikuti server: `month` kosong =
 * Januari; `endYear` kosong = `year`; `endMonth` kosong = `month` (satu
 * bulan), atau Desember bila `month` juga kosong. Maksimal 60 bulan.
 */
export interface HydrologyPeriod {
	year: number;
	month?: number;
	endYear?: number;
	endMonth?: number;
}

/** Satu bulan pada grafik akumulasi. Bulan yang belum diisi bernilai `null`, bukan 0. */
export interface MonthlyAccumulationPoint {
	/** `YYYY-MM`. */
	period: string;
	year: number;
	month: number;
	targetMwh: NullableMetric;
	actualMwh: NullableMetric;
	/** Berapa PLTA yang menyumbang tiap seri; 0 atau 1 bila grafiknya satu PLTA. */
	targetPlantCount: number;
	actualPlantCount: number;
	/** Teks server, mis. `s.d. Bulan Maret 2026`; untuk tooltip. */
	throughLabel: string | null;
}

/**
 * Target vs realisasi akumulasi produksi per bulan. Tanpa `pltaId`, nilainya
 * JUMLAH seluruh PLTA — dan `*PlantCount` wajib diperiksa sebelum kedua seri
 * dibandingkan: realisasi yang baru diisi 10 dari 13 PLTA tampak jauh di bawah
 * target 13 PLTA padahal hanya belum lengkap.
 */
export interface MonthlyAccumulationChart {
	pltaId: string | null;
	registeredPlantCount: number;
	points: MonthlyAccumulationPoint[];
}

/** Satu metrik panel harian beserta status sembunyi dan urutannya untuk satu PLTA. */
export interface DailyMetricVisibility {
	key: string;
	panel: DailyReportPanel;
	label: string;
	hidden: boolean;
	/** `true` = posisinya pernah diatur untuk PLTA ini; `false` = posisi bawaan. */
	isCustomOrder: boolean;
	/** Nama bawaan sistem, dipakai lagi bila nama khusus dihapus. */
	defaultLabel: string;
	/** `true` = nama khusus dari admin sedang berlaku. */
	isLabelCustom: boolean;
}

/**
 * Ganti nama, parsial: kunci yang tidak disebut tidak berubah, `null`
 * mengembalikan ke nama bawaan. Dipakai nama metrik harian (per PLTA) dan
 * nama bidang bulanan (seluruh PLTA).
 */
export type LabelChanges = Record<string, string | null>;

/** Satu bidang hidrologi bulanan beserta namanya (`GET /hydrology/monthly/labels`). */
export interface MonthlyFieldLabel {
	key: string;
	/** Nama dasar yang berlaku, tanpa akhiran "s.d. Bulan …". */
	label: string;
	defaultLabel: string;
	isCustom: boolean;
	/** `true` = sistem menambahkan "s.d. Bulan <X>" di belakang nama ini. */
	isAccumulated: boolean;
	updatedBy: string | null;
	updatedAt: string | null;
}

export interface MonthlyFieldLabels {
	customCount: number;
	fields: MonthlyFieldLabel[];
}

/**
 * Perubahan tata letak panel harian, keduanya parsial. `hidden`: kunci yang
 * tidak disebut tidak berubah. `order`: urutan per panel dari atas ke bawah;
 * panel yang tidak disebut tidak berubah, `[]` mengembalikan panel itu ke
 * urutan bawaan server.
 */
export interface DailyLayoutChanges {
	hidden?: Record<string, boolean>;
	order?: Partial<Record<DailyReportPanel, string[]>>;
}

/** Seluruh metrik panel harian satu PLTA, urut seperti tampil di panel. */
export interface DailyVisibility {
	pltaId: string;
	hiddenCount: number;
	metrics: DailyMetricVisibility[];
}

/** Hasil unggah Excel harian seluruh PLTA. */
export interface DailyHydrologyExcelResult {
	processedRows: number;
	/** Jumlah nilai (PLTA × tanggal × parameter) yang tersimpan. */
	writtenPoints: number;
	pltaCodes: string[];
	/** Tanggal-tanggal yang tersentuh, `YYYY-MM-DD`. */
	periods: string[];
	/** Sel kosong yang diisi nilai sebelumnya; nol bila mode `skip`. */
	inheritedPoints: number;
}

/**
 * Perlakuan sel kosong saat unggah Excel harian. `skip` (bawaan server): tidak
 * menimpa apa pun. `carry-forward`: mewarisi nilai terisi terakhir pada kolom
 * dan PLTA yang sama, diurut waktu.
 */
export type DailyEmptyCellMode = 'skip' | 'carry-forward';

export interface DailyTemplateOptions {
	/** `true` = 24 baris per (PLTA, tanggal), satu per jam 0–23; bawaan satu baris harian. */
	perHour?: boolean;
}

export interface DailyExcelUploadOptions {
	emptyCells?: DailyEmptyCellMode;
}

/** Panel laporan harian. `dam` = BENDUNGAN di layar. */
export type DailyReportPanel = 'hulu' | 'dam' | 'hilir';

/**
 * Cakupan laporan Excel hidrologi. `month` kosong = setahun penuh, `pltaId`
 * kosong = seluruh PLTA.
 */
export interface HydrologyReportScope {
	year: number;
	month?: number;
	pltaId?: string;
}

/** Laporan bulanan mendukung rentang; laporan harian tidak. */
export interface MonthlyReportScope extends HydrologyReportScope {
	endYear?: number;
	endMonth?: number;
}

export interface DailyHydrologyReportScope extends HydrologyReportScope {
	/** Kosong = ketiga panel, masing-masing satu lembar. */
	panel?: DailyReportPanel;
}

export interface UpsertMonthlyHydrologyInput {
	pltaId: string;
	year: number;
	month: number;
	hydrologyPrediction?: string;
	hydrologyActual?: string;
	predictedProductionMwh?: number;
	targetProductionMwh?: number;
	actualProductionMwh?: number;
	predictedAccumulatedMwh?: number;
	targetAccumulatedMwh?: number;
	actualAccumulatedMwh?: number;
}

/**
 * Gambar prakiraan hujan adalah produk regional, bukan pengukuran per
 * pembangkit: peta
 * Agustus 2026 sama saja dilihat dari Mrica, Wonogiri, atau Jelok. Karena itu
 * kuncinya `(tahun, bulan, jenis)` tanpa `pltaId` — satu unggahan berlaku untuk
 * seluruh PLTA, termasuk PLTA yang ditambahkan setelahnya.
 */
export interface UploadMonthlyHydrologyImageInput {
	year: number;
	month: number;
	kind: MonthlyHydrologyImageKind;
	file: File;
}

/** Ringkasan hasil `POST /hydrology/monthly/excel` — dilaporkan setelah tersimpan. */
export interface MonthlyHydrologyExcelResult {
	processedRows: number;
	created: number;
	updated: number;
	pltaCodes: string[];
	periods: string[];
}

/**
 * Satu baris bermasalah dari berkas yang ditolak. Impornya atomik: bila daftar
 * ini terisi, tidak ada satu pun baris yang tersimpan.
 */
export interface MonthlyHydrologyExcelRowError {
	row: number;
	pltaCode: string | null;
	message: string;
}
