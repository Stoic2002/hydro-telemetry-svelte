import type {
	AchievementStatus,
	DashboardMetric,
	DashboardMetricGroup,
	MonthlyAchievement,
	MonthlyHydrology,
	NullableMetric
} from '$features/hydrology';
import type { MonitoringParameter, MonitoringParameterLatest } from '$features/monitoring';
import type {
	DailyTelemetryUploadStation,
	DailyTelemetryUploadTarget
} from '$features/telemetry-upload';
import { formatLongCalendarDate, toISODateWIB } from '$shared/lib/date';
import { displayUnit } from '$shared/utils/unit';

export const MONTHS = [
	'Januari',
	'Februari',
	'Maret',
	'April',
	'Mei',
	'Juni',
	'Juli',
	'Agustus',
	'September',
	'Oktober',
	'November',
	'Desember'
] as const;

/**
 * Sejalan dengan `SourceMarkerType` — penanda barisnya memakai tipe yang sama.
 *
 * Panel harian hanya memakai empat (13 Okt 2026): Realtime, Formulasi, Input,
 * dan Konstanta (input). Penanda "Konstanta" polos dan "Belum tersedia" dihapus
 * atas permintaan tim — baris tanpa nilai tetap memakai penanda sumbernya.
 * `unavailable` tinggal untuk sel tabel bulanan yang belum terisi.
 */
export type MetricSource = 'api' | 'formula' | 'input' | 'constant-input' | 'unavailable';

/** Pembacaan per stasiun di dalam satu parameter. */
export interface MetricSubRow {
	label: string;
	value: string;
	unit?: string;
}

/**
 * Umur pembacaan sensor yang dianggap perlu perhatian.
 *
 * Status "Realtime aktif" di header hanya berarti koneksi WebSocket terbuka,
 * bukan sensornya masih mengirim. Sensor yang berhenti pukul 08.00 tetap
 * menampilkan angka 08.00 sampai sore, dan tanpa penanda umur angka itu tidak
 * bisa dibedakan dari angka yang baru masuk.
 */
export interface FreshnessThresholds {
	/** Lewat dari ini (menit): badge kuning. */
	aging: number;
	/** Lewat dari ini (menit): badge merah dan nilainya diredupkan. */
	stale: number;
}

/**
 * Ambang untuk sensor yang mengirim tiap 1–10 menit (TMA, debit, guide vane,
 * cuaca). Diukur di staging 25 Sep 2026: TMA tiap 1 menit, debit dan guide vane
 * tiap 6, suhu udara umumnya 10 tetapi sesekali 23 menit tanpa ada yang salah —
 * karena itu kuning mulai 30, bukan 15.
 */
export const METRIC_FRESHNESS_MINUTES: FreshnessThresholds = { aging: 30, stale: 60 };

/**
 * Sensor yang memang mengirim sekali per jam. Dengan ambang bawaan, keduanya
 * kuning 45 menit dari setiap jam dan berkedip merah tepat sebelum pembacaan
 * berikutnya — derau yang membuat operator berhenti memperhatikan badge.
 * Kuning = satu pembacaan terlewat, merah = dua.
 */
export const HOURLY_SENSOR_FRESHNESS_MINUTES: FreshnessThresholds = { aging: 90, stale: 180 };

/**
 * Curah hujan dicocokkan lewat awalan, bukan daftar kunci: setiap stasiun hujan
 * (`curah_hujan` di hulu, `curah_hujan_bendungan`, …) mengirim tiap 60 menit,
 * dan stasiun baru tidak boleh diam-diam jatuh ke ambang sensor cepat.
 */
function isHourlySensor(key: string): boolean {
	return key.startsWith('curah_hujan') || key === 'elevasi_sedimen';
}

export function freshnessThresholdsFor(key: string): FreshnessThresholds {
	return isHourlySensor(key) ? HOURLY_SENSOR_FRESHNESS_MINUTES : METRIC_FRESHNESS_MINUTES;
}

export type MetricFreshnessLevel = 'aging' | 'stale';

/** Hanya terisi bila pembacaan sudah melewati ambang `aging`. */
export interface MetricFreshness {
	level: MetricFreshnessLevel;
	/** Umur yang siap tampil, mis. "32 mnt lalu". */
	ageLabel: string;
	measuredAt: string;
}

export function formatReadingAge(minutes: number): string {
	if (minutes < 60) return `${Math.floor(minutes)} mnt lalu`;
	if (minutes < 60 * 24) return `${Math.floor(minutes / 60)} jam lalu`;
	return `${Math.floor(minutes / (60 * 24))} hari lalu`;
}

/**
 * Umur satu pembacaan terhadap `now`. `undefined` bila masih segar atau waktu
 * pembacaannya tidak diketahui — tanpa waktu, tidak ada dasar untuk menyebutnya
 * basi. Waktu di masa depan (jam server dan klien tidak sama persis) dianggap
 * segar.
 */
export function metricFreshness(
	measuredAt: string | null | undefined,
	now: number,
	thresholds: FreshnessThresholds = METRIC_FRESHNESS_MINUTES
): MetricFreshness | undefined {
	if (!measuredAt) return undefined;
	const timestamp = new Date(measuredAt).getTime();
	if (Number.isNaN(timestamp)) return undefined;

	const minutes = (now - timestamp) / 60_000;
	if (minutes < thresholds.aging) return undefined;

	return {
		level: minutes < thresholds.stale ? 'aging' : 'stale',
		ageLabel: formatReadingAge(minutes),
		measuredAt
	};
}

export interface MetricRow {
	/** Kunci metrik dari server; dipakai sebagai id elemen untuk lompatan dari ringkasan. */
	key?: string;
	label: string;
	value: string;
	unit?: string;
	source: string;
	sourceType: MetricSource;
	hasData?: boolean;
	uploadTarget?: DailyTelemetryUploadTarget;
	/** Terisi hanya bila parameter punya lebih dari satu stasiun. */
	subRows?: MetricSubRow[];
	/** Terisi hanya untuk pembacaan sensor yang sudah melewati ambang umur. */
	freshness?: MetricFreshness;
	/** Nilainya sedang dihitung ulang server (mis. penyebut DMN diganti); tampilkan shimmer. */
	isRecalculating?: boolean;
}

/**
 * Metrik yang berubah bila penyebut DMN diganti. Menurut backend hanya SHFL
 * (ketersediaan energi thd MOL ÷ beban penuh) dan beban penuhnya sendiri;
 * ketersediaan energi F4/F5 sengaja tidak terpengaruh.
 */
export const DMN_DEPENDENT_METRIC_KEYS: ReadonlySet<string> = new Set([
	'service_hour_full_load',
	'dmn_beban_penuh'
]);

/** Tandai baris yang nilainya menunggu hasil penyebut DMN yang baru. */
export function markRecalculating(rows: MetricRow[], isRecalculating: boolean): MetricRow[] {
	if (!isRecalculating) return rows;
	return rows.map((row) =>
		row.key && DMN_DEPENDENT_METRIC_KEYS.has(row.key) ? { ...row, isRecalculating: true } : row
	);
}

/** Nilai realtime yang menimpa nilai dari endpoint harian. */
export interface MetricOverride {
	value: NullableMetric;
	source: string;
	time?: string | null;
}

export interface MetricSection {
	title: string;
	rows: MetricRow[];
}

/**
 * Baris sensor yang sudah basi (`stale`), yang paling lama diam lebih dulu.
 *
 * Yang `aging` sengaja tidak ikut: terlambat 15–60 menit biasanya hanya
 * pengiriman yang tertunda, dan memasukkannya ke ringkasan membuat banner
 * hampir selalu muncul. Badge kuning di barisnya sudah cukup.
 */
export function staleMetricRows(sections: MetricSection[]): MetricRow[] {
	return sections
		.flatMap((section) => section.rows)
		.filter((row) => row.freshness?.level === 'stale')
		.sort(
			(first, second) =>
				Date.parse(first.freshness!.measuredAt) - Date.parse(second.freshness!.measuredAt)
		);
}

export function formatHydrologyMetric(value: NullableMetric, maximumFractionDigits = 2): string {
	if (value === null || !Number.isFinite(value)) return 'N/A';

	return value.toLocaleString('id-ID', {
		minimumFractionDigits: 0,
		maximumFractionDigits
	});
}

export function formatHydrologyDate(value: string): string {
	return formatLongCalendarDate(value);
}

function monitoringTimestamp(reading: MonitoringParameterLatest): number {
	if (!reading.time) return 0;
	const timestamp = new Date(reading.time).getTime();
	return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function latestMonitoringParameter(
	parameters: MonitoringParameterLatest[],
	parameterName: MonitoringParameter,
	stationKeywords: string[] = [],
	allowAnyStation = false
): MonitoringParameterLatest | undefined {
	const candidates = parameters.filter(
		(parameter) => parameter.parameter === parameterName && parameter.value !== null
	);
	const preferredCandidates =
		stationKeywords.length > 0
			? candidates.filter((parameter) => {
					const station = parameter.station.toLocaleLowerCase();
					return stationKeywords.some((keyword) => station.includes(keyword));
				})
			: candidates;
	const pool =
		preferredCandidates.length > 0 ? preferredCandidates : allowAnyStation ? candidates : [];

	return pool.reduce<MonitoringParameterLatest | undefined>(
		(latest, candidate) =>
			!latest || monitoringTimestamp(candidate) > monitoringTimestamp(latest) ? candidate : latest,
		undefined
	);
}

export function monitoringSource(reading: MonitoringParameterLatest | undefined): string {
	return reading ? 'Realtime' : 'Belum tersedia';
}

const dashboardSourceType: Record<
	DashboardMetric['source'],
	Exclude<MetricSource, 'unavailable'>
> = {
	measured: 'api',
	derived: 'formula',
	plan: 'input',
	constant: 'constant-input'
};

const dashboardSourceLabel: Record<DashboardMetric['source'], string> = {
	measured: 'Realtime',
	derived: 'Formulasi',
	plan: 'Input',
	constant: 'Konstanta (input)'
};

/**
 * Satu stasiun tidak dijadikan sub-baris: nilai induknya sudah nilai stasiun itu,
 * jadi menampilkannya lagi hanya mengulang angka yang sama.
 */
function metricSubRows(metric: DashboardMetric): MetricSubRow[] | undefined {
	const stations = metric.stations ?? [];
	if (stations.length < 2) return undefined;

	return stations.map((station) => ({
		label: station.label || station.station,
		value: formatHydrologyMetric(station.value),
		unit: displayUnit(metric.unit)
	}));
}

export function dashboardMetricRow(
	key: string,
	metric: DashboardMetric,
	isLoading: boolean,
	uploadTarget?: DailyTelemetryUploadTarget,
	override?: MetricOverride,
	now?: number
): MetricRow {
	const sourceType = override ? 'api' : dashboardSourceType[metric.source];
	const source = override?.source ?? dashboardSourceLabel[metric.source];

	if (isLoading) {
		return {
			key,
			label: metric.label || key,
			value: 'Memuat…',
			source: 'Memuat',
			sourceType,
			hasData: false,
			uploadTarget
		};
	}

	const value = override?.value ?? metric.value;
	if (value === null) {
		// Penanda tetap penanda sumbernya — operator perlu tahu baris kosong ini
		// menunggu sensor, formula, atau isiannya sendiri.
		return {
			key,
			label: metric.label || key,
			value: 'N/A',
			source,
			sourceType,
			hasData: false,
			uploadTarget,
			subRows: metricSubRows(metric)
		};
	}

	// Umur hanya berarti untuk pembacaan sensor. Rencana, konstanta, dan hasil
	// formula diisi sekali sehari atau dihitung ulang server, jadi "sudah lama"
	// adalah keadaan normalnya, bukan tanda sensor berhenti. Begitu juga realisasi
	// yang di PLTA ini diisi manual (baris yang punya tombol isian) — mis. debit
	// spillway di PLTA tanpa sensor pintu.
	const isSensorReading = override !== undefined || (metric.source === 'measured' && !uploadTarget);
	const freshness =
		isSensorReading && now !== undefined
			? metricFreshness(override ? override.time : metric.time, now, freshnessThresholdsFor(key))
			: undefined;

	return {
		key,
		label: metric.label,
		value: formatHydrologyMetric(value),
		unit: displayUnit(metric.unit),
		source,
		sourceType,
		hasData: true,
		uploadTarget,
		subRows: metricSubRows(metric),
		freshness
	};
}

export function dashboardMetricRows(
	group: DashboardMetricGroup | undefined,
	isLoading: boolean,
	uploadTargets: Record<string, DailyTelemetryUploadTarget | undefined> = {},
	overrides: Record<string, MetricOverride | undefined> = {},
	preferredKeys: string[] = [],
	now?: number
): MetricRow[] {
	const priority = new Map(preferredKeys.map((key, index) => [key, index]));
	const byPriority = (firstKey: string, secondKey: string) =>
		(priority.get(firstKey) ?? Number.MAX_SAFE_INTEGER) -
		(priority.get(secondKey) ?? Number.MAX_SAFE_INTEGER);

	// Metrik yang disembunyikan operator tetap dikirim server; yang
	// menyembunyikannya adalah layar ini, termasuk dari ringkasan sensor basi.
	const visible = Object.entries(group ?? {}).filter(([, metric]) => !metric.hidden);

	// Urutan dari server (diatur per PLTA lewat Atur tampilan) menang. Hanya bila
	// SELURUH metrik membawanya: mencampur dua sumber urutan dalam satu panel
	// menghasilkan susunan yang tidak dimaksud siapa pun. `preferredKeys` tinggal
	// cadangan untuk backend yang belum mengirim `urutan`.
	const hasServerOrder = visible.every(([, metric]) => metric.order !== null);
	const entries = visible.sort(([firstKey, first], [secondKey, second]) =>
		hasServerOrder
			? (first.order as number) - (second.order as number) || byPriority(firstKey, secondKey)
			: byPriority(firstKey, secondKey)
	);

	if (entries.length === 0) {
		// Data pertama belum datang: satu baris memuat menjaga kartu tetap berisi.
		// Panel yang memang kosong dijelaskan kartunya — baris "N/A" tanpa nama
		// dulu dipakai di sini dan terbaca seperti parameter sungguhan.
		return isLoading
			? [
					{
						label: 'Memuat parameter…',
						value: 'Memuat…',
						source: 'Memuat',
						sourceType: 'api',
						hasData: false
					}
				]
			: [];
	}

	return entries.map(([key, metric]) =>
		dashboardMetricRow(key, metric, isLoading, uploadTargets[key], overrides[key], now)
	);
}

export function currentWibDate(date = new Date()): string {
	return toISODateWIB(date);
}

function uploadStation(input: { station: string }, label?: string): DailyTelemetryUploadStation {
	return { station: input.station, label: label || input.station || 'Default' };
}

/**
 * Target unggah untuk setiap baris panel yang bisa diisi manual di PLTA ini,
 * **hanya** dari field `input` yang dikirim server (13 Okt 2026).
 *
 * Dulu tujuan disusun dari daftar tag PLTA ditambah tabel cadangan per kunci
 * metrik. Backend kini mengisi `input` untuk semua kasus dan menegaskan
 * tujuan tidak boleh diturunkan dari `source`: Pintu Air ber-`source` `plan`
 * padahal tagnya tidak ada (unggahannya ditolak), dan Target TMA sengaja
 * `input: null` karena diubah lewat RTOW, bukan telemetri. `input` yang tidak
 * `null` dijamin diterima server.
 *
 * Metrik multi-stasiun (pintu spillway G1–G4, stasiun hujan) ber-`input` `null`
 * di tingkat metrik, tetapi tiap stasiun membawa `input`-nya sendiri; seluruh
 * stasiun itu menjadi pilihan Station di satu form. Label dan satuan diambil
 * dari metriknya, jadi judul form selalu sama dengan nama baris yang diklik.
 */
export function resolveMetricUploadTargets(
	groups: (DashboardMetricGroup | undefined)[]
): Record<string, DailyTelemetryUploadTarget | undefined> {
	const targets: Record<string, DailyTelemetryUploadTarget | undefined> = {};

	for (const group of groups) {
		for (const [key, metric] of Object.entries(group ?? {})) {
			const base = { label: metric.label || key, unit: metric.unit ?? '' };

			if (metric.input) {
				targets[key] = {
					...base,
					parameter: metric.input.parameter as MonitoringParameter,
					stations: [uploadStation(metric.input)]
				};
				continue;
			}

			const stationInputs = (metric.stations ?? []).filter((station) => station.input !== null);
			const parameter = stationInputs[0]?.input?.parameter;
			if (!parameter) continue;

			// Satu form = satu parameter. Stasiun berparameter lain (belum pernah
			// terjadi) tidak dicampur ke pilihan Station.
			targets[key] = {
				...base,
				parameter: parameter as MonitoringParameter,
				stations: stationInputs
					.filter((station) => station.input?.parameter === parameter)
					.map((station) => uploadStation(station.input!, station.label))
			};
		}
	}

	return targets;
}

/**
 * Satu sel pada tabel pembanding bulanan. Hanya yang dibutuhkan tampilan:
 * nilai terformat dan penanda sumbernya.
 */
export type MonthlyCell = Pick<MetricRow, 'value' | 'source' | 'sourceType'>;

export type MonthlyColumn = 'target' | 'prediction' | 'actual';

export const MONTHLY_COLUMNS: { key: MonthlyColumn; label: string }[] = [
	{ key: 'target', label: 'Target' },
	{ key: 'prediction', label: 'Prediksi' },
	{ key: 'actual', label: 'Realisasi' }
];

/**
 * Satu parameter dengan pasangan target / prediksi / realisasinya. Kolom yang
 * tidak punya padanan **tidak diisi** (bukan `N/A`): "tidak ada" berarti
 * parameter itu memang tidak dikenal untuk kolom tersebut, sedangkan `N/A`
 * berarti seharusnya ada tetapi belum terisi.
 */
export interface MonthlyComparisonRow {
	label: string;
	unit?: string;
	cells: Partial<Record<MonthlyColumn, MonthlyCell>>;
	/** Prediksi ÷ target pasangan ini; hanya baris yang punya target dan prediksi angka. */
	achievement?: MonthlyAchievementView;
}

/**
 * Persentase pencapaian beserta status dari server. Statusnya **tidak**
 * dihitung ulang di sini: `prosentase` dibulatkan, sehingga 99,996% terbaca
 * 100 padahal belum tercapai — server menilai dari angka mentahnya.
 */
export interface MonthlyAchievementView {
	value: string;
	/** `null` = server belum bisa menilai. */
	status: AchievementStatus;
	isAvailable: boolean;
}

export interface MonthlyComparison {
	rows: MonthlyComparisonRow[];
}

function monthlyMetricRow(
	label: string,
	value: NullableMetric,
	sourceType: Exclude<MetricSource, 'unavailable'>,
	unit: string,
	maximumFractionDigits = 2,
	availableSource = 'Data bulanan'
): MetricRow {
	const isAvailable = value !== null && Number.isFinite(value);

	return {
		label,
		value: formatHydrologyMetric(value, maximumFractionDigits),
		unit: isAvailable ? unit : undefined,
		source: isAvailable ? availableSource : 'Belum tersedia',
		sourceType: isAvailable ? sourceType : 'unavailable'
	};
}

function monthlyCell(value: NullableMetric, sourceType: 'api' | 'input'): MonthlyCell {
	const { value: text, source, sourceType: type } = monthlyMetricRow('', value, sourceType, '');
	return { value: text, source, sourceType: type };
}

function monthlyTextCell(value: string | null | undefined): MonthlyCell {
	return {
		value: value || 'N/A',
		source: value ? 'Data bulanan' : 'Belum tersedia',
		sourceType: value ? 'api' : 'unavailable'
	};
}

function achievementView(achievement: MonthlyAchievement | undefined): MonthlyAchievementView {
	const percentage = achievement?.percentage ?? null;
	const isAvailable = percentage !== null && Number.isFinite(percentage);

	return {
		value: formatHydrologyMetric(percentage, 1),
		status: isAvailable ? (achievement?.status ?? null) : null,
		isAvailable
	};
}

export function buildMonthlyComparison(
	record: MonthlyHydrology | undefined,
	monthLabel: string
): MonthlyComparison {
	return {
		rows: [
			{
				label: 'Kondisi hidrologi',
				cells: {
					prediction: monthlyTextCell(record?.hydrologyPrediction),
					actual: monthlyTextCell(record?.hydrologyActual)
				}
			},
			{
				label: `Energi ${monthLabel}`,
				unit: 'MWh',
				cells: {
					target: monthlyCell(record?.targetProductionMwh ?? null, 'input'),
					prediction: monthlyCell(record?.predictedProductionMwh ?? null, 'api'),
					actual: monthlyCell(record?.actualProductionMwh ?? null, 'api')
				},
				achievement: achievementView(record?.monthlyAchievement)
			},
			{
				label: `Energi akumulasi s.d. ${monthLabel}`,
				unit: 'MWh',
				cells: {
					target: monthlyCell(record?.targetAccumulatedMwh ?? null, 'input'),
					prediction: monthlyCell(record?.predictedAccumulatedMwh ?? null, 'api'),
					actual: monthlyCell(record?.actualAccumulatedMwh ?? null, 'api')
				},
				achievement: achievementView(record?.accumulatedAchievement)
			}
		]
	};
}

/**
 * Mode tampilan Hidrologi Harian (13 Okt 2026). Dua sumbu yang bisa dipadukan
 * — zona mana yang tampil, dan baris mana di dalamnya — keduanya di query
 * string (`?zona=`, `?baris=`) supaya bisa dibagikan seperti filter lain.
 */
export type DailyZoneFilter = 'semua' | 'hulu' | 'bendungan' | 'hilir';
export type DailyRowFilter = 'semua' | 'perhatian' | 'manual' | 'ringkas';

export const DAILY_ZONE_FILTERS: { value: DailyZoneFilter; label: string }[] = [
	{ value: 'semua', label: 'Semua' },
	{ value: 'hulu', label: 'Hulu' },
	{ value: 'bendungan', label: 'Bendungan' },
	{ value: 'hilir', label: 'Hilir' }
];

export const DAILY_ROW_FILTERS: { value: DailyRowFilter; label: string }[] = [
	{ value: 'semua', label: 'Semua' },
	{ value: 'perhatian', label: 'Perlu perhatian' },
	{ value: 'manual', label: 'Isian manual' },
	{ value: 'ringkas', label: 'Ringkas' }
];

export function parseDailyZoneFilter(raw: string | null): DailyZoneFilter {
	return DAILY_ZONE_FILTERS.some((option) => option.value === raw)
		? (raw as DailyZoneFilter)
		: 'semua';
}

export function parseDailyRowFilter(raw: string | null): DailyRowFilter {
	return DAILY_ROW_FILTERS.some((option) => option.value === raw)
		? (raw as DailyRowFilter)
		: 'semua';
}

/**
 * Metrik kunci mode Ringkas: posisi air, aliran masuk-keluar, cadangan energi,
 * dan tinggi jatuh. Usulan awal; isinya menunggu kesepakatan tim.
 */
export const SUMMARY_METRIC_KEYS: ReadonlySet<string> = new Set([
	'tma_waduk',
	'target_tma',
	'inflow',
	'volume_efektif_thd_target',
	'service_hour_full_load',
	'debit_turbin_total',
	'debit_spillway',
	'head'
]);

function needsAttention(row: MetricRow, pendingFormulas: ReadonlySet<string>): boolean {
	return (
		row.freshness !== undefined ||
		!row.hasData ||
		(row.key !== undefined && pendingFormulas.has(row.key))
	);
}

function isManualRow(row: MetricRow): boolean {
	return (
		row.uploadTarget !== undefined ||
		row.sourceType === 'input' ||
		row.sourceType === 'constant-input'
	);
}

/**
 * Baris yang tampil pada mode `filter`. Baris memuat selalu dipertahankan,
 * supaya kartu tidak tampak kosong sebelum data pertama datang.
 *
 * - **Perlu perhatian**: sensor kuning/merah, nilai kosong, dan formula yang
 *   masih menunggu data.
 * - **Isian manual**: baris yang diisi operator (Input, Konstanta (input)) atau
 *   punya tombol isian.
 * - **Ringkas**: `SUMMARY_METRIC_KEYS`.
 */
export function filterMetricRows(
	rows: MetricRow[],
	filter: DailyRowFilter,
	pendingFormulas: ReadonlySet<string> = new Set()
): MetricRow[] {
	if (filter === 'semua') return rows;

	return rows.filter((row) => {
		if (row.source === 'Memuat') return true;
		if (filter === 'perhatian') return needsAttention(row, pendingFormulas);
		if (filter === 'manual') return isManualRow(row);
		return row.key !== undefined && SUMMARY_METRIC_KEYS.has(row.key);
	});
}

export const DAILY_ROW_FILTER_EMPTY_MESSAGE: Record<Exclude<DailyRowFilter, 'semua'>, string> = {
	perhatian: 'Semua parameter di zona ini normal.',
	manual: 'Tidak ada parameter isian manual di zona ini.',
	ringkas: 'Tidak ada metrik kunci di zona ini.'
};
