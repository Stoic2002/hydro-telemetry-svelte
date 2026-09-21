import type {
	DashboardMetric,
	DashboardMetricGroup,
	MonthlyHydrology,
	NullableMetric
} from '$features/hydrology';
import type { MonitoringParameter, MonitoringParameterLatest } from '$features/monitoring';
import type { PlantTag } from '$features/plta';
import type { DailyTelemetryUploadTarget } from '$features/telemetry-upload';
import { formatLongCalendarDate, toISODateWIB } from '$shared/lib/date';

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

/** Sejalan dengan `SourceMarkerType` — penanda barisnya memakai tipe yang sama. */
export type MetricSource =
	'api' | 'formula' | 'input' | 'unavailable' | 'constant' | 'constant-input';

/** Pembacaan per stasiun di dalam satu parameter. */
export interface MetricSubRow {
	label: string;
	value: string;
	unit?: string;
}

export interface MetricRow {
	label: string;
	value: string;
	unit?: string;
	source: string;
	sourceType: MetricSource;
	hasData?: boolean;
	uploadTarget?: DailyTelemetryUploadTarget;
	/** Terisi hanya bila parameter punya lebih dari satu stasiun. */
	subRows?: MetricSubRow[];
}

export interface MetricSection {
	title: string;
	rows: MetricRow[];
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
	constant: 'constant'
};

const dashboardSourceLabel: Record<DashboardMetric['source'], string> = {
	measured: 'Realtime',
	derived: 'Formulasi',
	plan: 'Rencana',
	constant: 'Konstanta'
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
		unit: metric.unit ?? undefined
	}));
}

export function dashboardMetricRow(
	key: string,
	metric: DashboardMetric | undefined,
	isLoading: boolean,
	uploadTarget?: DailyTelemetryUploadTarget,
	override?: { value: NullableMetric; source: string }
): MetricRow {
	if (isLoading) {
		return {
			label: metric?.label ?? key,
			value: 'Memuat…',
			source: 'Memuat',
			sourceType: 'api',
			hasData: false,
			uploadTarget
		};
	}

	if (!metric || (override?.value ?? metric.value) === null) {
		return {
			label: metric?.label ?? key,
			value: 'N/A',
			source: 'Belum tersedia',
			sourceType: 'unavailable',
			hasData: false,
			uploadTarget,
			subRows: metric ? metricSubRows(metric) : undefined
		};
	}

	// Konstanta yang punya tag unggah dibedakan dari konstanta yang hanya bisa
	// diubah lewat konfigurasi server: penandanya menggabungkan bentuk konstanta
	// dengan warna input, sehingga operator tahu baris itu bisa dia isi sendiri.
	const baseSourceType = dashboardSourceType[metric.source];
	const sourceType = override
		? 'api'
		: baseSourceType === 'constant' && uploadTarget
			? 'constant-input'
			: baseSourceType;

	return {
		label: metric.label,
		value: formatHydrologyMetric(override?.value ?? metric.value),
		unit: metric.unit ?? undefined,
		source: override?.source ?? dashboardSourceLabel[metric.source],
		sourceType,
		hasData: true,
		uploadTarget,
		subRows: metricSubRows(metric)
	};
}

export function dashboardMetricRows(
	group: DashboardMetricGroup | undefined,
	isLoading: boolean,
	uploadTargets: Record<string, DailyTelemetryUploadTarget | undefined> = {},
	overrides: Record<string, { value: NullableMetric; source: string } | undefined> = {},
	preferredKeys: string[] = []
): MetricRow[] {
	const priority = new Map(preferredKeys.map((key, index) => [key, index]));
	const entries = Object.entries(group ?? {}).sort(([firstKey], [secondKey]) => {
		const firstPriority = priority.get(firstKey) ?? Number.MAX_SAFE_INTEGER;
		const secondPriority = priority.get(secondKey) ?? Number.MAX_SAFE_INTEGER;
		return firstPriority - secondPriority;
	});

	if (entries.length === 0) {
		return [dashboardMetricRow('Parameter dashboard', undefined, isLoading)];
	}

	return entries.map(([key, metric]) =>
		dashboardMetricRow(key, metric, isLoading, uploadTargets[key], overrides[key])
	);
}

export function currentWibDate(date = new Date()): string {
	return toISODateWIB(date);
}

export function buildUploadTarget(
	tags: PlantTag[],
	parameter: MonitoringParameter,
	label: string,
	unit: string,
	station?: string
): DailyTelemetryUploadTarget | undefined {
	const matchingTags = tags.filter(
		(tag) =>
			tag.parameter === parameter &&
			tag.protocol === 'upload' &&
			tag.enabled &&
			(station === undefined || tag.station.toUpperCase() === station.toUpperCase())
	);

	if (matchingTags.length === 0) return undefined;

	return {
		label,
		parameter,
		unit,
		tags: matchingTags
	};
}

/**
 * Cadangan pemetaan baris panel harian → parameter unggahnya.
 *
 * Sumber utamanya sekarang field `input` pada tiap metrik, yang dikirim server.
 * Tabel ini hanya dipakai untuk baris yang `input`-nya masih `null` padahal
 * PLTA-nya punya tag, yaitu dua kasus yang belum ditangani backend:
 *
 * 1. Rencana turbin di PLTA yang tagnya TIDAK dipecah per unit — tag
 *    `plan_outflow_turbine` tanpa station, sementara barisnya per unit.
 * 2. Realisasi spillway (`outflow_spillway`) yang di sebagian PLTA diisi manual.
 *
 * Tanpa cadangan ini, tombol "Input data" di baris-baris itu hilang. Hapus
 * tabelnya begitu backend mengisi `input` untuk kedua kasus tersebut.
 */
interface MetricUploadBinding {
	parameter: MonitoringParameter;
	/** Station tag yang dituju. Kosong = seluruh station parameter itu. */
	station?: string;
	/**
	 * Bila PLTA ini TIDAK memecah tag parameter itu per station, pakai tag
	 * tunggalnya. Hanya untuk turbin: sebagian PLTA mencatat rencana turbin per
	 * unit (`T1`, `T2`, …), sebagian lagi satu tag tanpa station.
	 *
	 * Pemecahan per station sengaja dihormati: di PLTA yang hanya punya T1–T3,
	 * baris Unit 4 harus tetap hanya-baca, bukan mengarah ke tag unit lain.
	 */
	fallbackToAnyStation?: boolean;
}

function turbineUnit(unit: number): MetricUploadBinding {
	return { parameter: 'plan_outflow_turbine', station: `T${unit}`, fallbackToAnyStation: true };
}

export const METRIC_UPLOAD_BINDINGS: Record<string, MetricUploadBinding> = {
	// Hulu
	target_tma: { parameter: 'plan_water_level' },
	batas_tma_limpas: { parameter: 'const_tma_limpas' },
	batas_tma_mol: { parameter: 'const_tma_mol' },

	// Bendungan — rencana
	rencana_debit_turbin_unit_1: turbineUnit(1),
	rencana_debit_turbin_unit_2: turbineUnit(2),
	rencana_debit_turbin_unit_3: turbineUnit(3),
	rencana_debit_turbin_unit_4: turbineUnit(4),
	rencana_debit_spillway: { parameter: 'plan_outflow_spillway' },
	rencana_debit_hjv: { parameter: 'plan_outflow_hjv' },
	rencana_debit_irigasi: { parameter: 'plan_outflow_irigasi' },
	rencana_debit_irigasi_kanan: { parameter: 'plan_outflow_irigasi', station: 'KANAN' },
	rencana_debit_irigasi_kiri: { parameter: 'plan_outflow_irigasi', station: 'KIRI' },
	rencana_debit_ddc: { parameter: 'plan_outflow_ddc' },
	rencana_debit_buangan_sampah: { parameter: 'plan_outflow_trash' },
	rencana_debit_intake_pdam: { parameter: 'plan_outflow_pdam' },
	rencana_debit_pintu_air: { parameter: 'plan_outflow_sluice' },
	rencana_debit_pintu_pembilas: { parameter: 'plan_outflow_flushing' },

	// Bendungan — realisasi yang di sebagian PLTA dicatat manual, bukan sensor
	debit_spillway: { parameter: 'outflow_spillway' },
	debit_hjv: { parameter: 'outflow_hjv' },
	debit_irigasi: { parameter: 'outflow_irigasi' },
	debit_irigasi_kanan: { parameter: 'outflow_irigasi', station: 'KANAN' },
	debit_irigasi_kiri: { parameter: 'outflow_irigasi', station: 'KIRI' },
	debit_ddc: { parameter: 'outflow_ddc' },
	debit_buangan_sampah: { parameter: 'outflow_trash' },
	debit_intake_pdam: { parameter: 'outflow_pdam' },
	debit_pintu_air: { parameter: 'outflow_sluice' },
	debit_pintu_pembilas: { parameter: 'outflow_flushing' },

	// Hilir
	tma_tailrace: { parameter: 'const_tma_tailrace' },
	batas_tma_hilir_maks: { parameter: 'const_tma_hilir_maks' },
	swc_acuan: { parameter: 'const_swc' }
};

/**
 * Target unggah untuk setiap baris panel yang bisa diisi manual di PLTA ini.
 *
 * Urutannya: `metric.input` dari server lebih dulu, lalu `METRIC_UPLOAD_BINDINGS`
 * sebagai cadangan. Label dan satuan diambil dari metriknya sendiri, jadi judul
 * form selalu sama dengan nama baris yang diklik operator.
 */
export function resolveMetricUploadTargets(
	groups: (DashboardMetricGroup | undefined)[],
	tags: PlantTag[]
): Record<string, DailyTelemetryUploadTarget | undefined> {
	const targets: Record<string, DailyTelemetryUploadTarget | undefined> = {};

	for (const group of groups) {
		for (const [key, metric] of Object.entries(group ?? {})) {
			const label = metric.label || key;
			const unit = metric.unit ?? '';

			// Server sudah menyebut tujuannya: pakai apa adanya, termasuk station.
			if (metric.input) {
				targets[key] = buildUploadTarget(
					tags,
					metric.input.parameter as MonitoringParameter,
					label,
					unit,
					metric.input.station || undefined
				);
				if (targets[key]) continue;
			}

			const binding = METRIC_UPLOAD_BINDINGS[key];
			if (!binding) continue;

			const isSplitPerStation = tags.some(
				(tag) => tag.parameter === binding.parameter && tag.enabled && tag.station !== ''
			);

			targets[key] =
				buildUploadTarget(tags, binding.parameter, label, unit, binding.station) ??
				(binding.fallbackToAnyStation && !isSplitPerStation
					? buildUploadTarget(tags, binding.parameter, label, unit)
					: undefined);
		}
	}

	return targets;
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

export function buildMonthlyForecastRows(
	record: MonthlyHydrology | undefined,
	monthLabel: string
): MetricRow[] {
	const apiSource = 'Data bulanan';

	return [
		{
			label: 'Prediksi hidrologi',
			value: record?.hydrologyPrediction || 'N/A',
			source: record?.hydrologyPrediction ? apiSource : 'Belum tersedia',
			sourceType: record?.hydrologyPrediction ? 'api' : 'unavailable'
		},
		{
			label: 'Aktual hidrologi',
			value: record?.hydrologyActual || 'N/A',
			source: record?.hydrologyActual ? apiSource : 'Belum tersedia',
			sourceType: record?.hydrologyActual ? 'api' : 'unavailable'
		},
		monthlyMetricRow(
			`Prediksi kemampuan produksi energi ${monthLabel}`,
			record?.predictedProductionMwh ?? null,
			'api',
			'MWh'
		),
		monthlyMetricRow(
			`Target produksi energi listrik ${monthLabel}`,
			record?.targetProductionMwh ?? null,
			'input',
			'MWh'
		),
		monthlyMetricRow(
			'Pencapaian energi s.d. bulan sebelumnya',
			record?.previousAchievementMwh ?? null,
			'api',
			'MWh'
		),
		monthlyMetricRow(
			`Prediksi pencapaian energi s.d. ${monthLabel}`,
			record?.predictedPreviousAchievementMwh ?? null,
			'api',
			'MWh'
		),
		monthlyMetricRow(
			`Target pencapaian energi s.d. ${monthLabel}`,
			record?.targetPreviousAchievementMwh ?? null,
			'input',
			'MWh'
		),
		monthlyMetricRow(
			'Persentase pencapaian',
			record?.achievementPercentage ?? null,
			'formula',
			'%',
			1,
			'Formulasi'
		)
	];
}
