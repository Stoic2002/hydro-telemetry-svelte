export type NullableMetric = number | null;

export type DashboardMetricSource = 'measured' | 'derived' | 'plan' | 'constant';

export interface DashboardStationMetric {
	station: string;
	label: string;
	value: NullableMetric;
	time: string | null;
}

export interface DashboardMetric {
	value: NullableMetric;
	unit: string | null;
	label: string;
	time: string | null;
	source: DashboardMetricSource;
	stations: DashboardStationMetric[] | null;
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

export interface MonthlyHydrology {
	id: string | null;
	pltaId: string;
	year: number;
	month: number;
	hydrologyPrediction: string | null;
	hydrologyActual: string | null;
	rainfallCharacteristicImage: string | null;
	rainfallImage: string | null;
	predictedProductionMwh: NullableMetric;
	targetProductionMwh: NullableMetric;
	previousAchievementMwh: NullableMetric;
	predictedPreviousAchievementMwh: NullableMetric;
	targetPreviousAchievementMwh: NullableMetric;
	achievementPercentage: NullableMetric;
}

export type MonthlyHydrologyImageKind = 'sifat_hujan' | 'curah_hujan';

export interface UpsertMonthlyHydrologyInput {
	pltaId: string;
	year: number;
	month: number;
	hydrologyPrediction?: string;
	hydrologyActual?: string;
	predictedProductionMwh?: number;
	targetProductionMwh?: number;
	previousAchievementMwh?: number;
	predictedPreviousAchievementMwh?: number;
	targetPreviousAchievementMwh?: number;
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
