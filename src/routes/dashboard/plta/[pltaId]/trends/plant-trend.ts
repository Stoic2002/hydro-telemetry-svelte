import type {
	PlantTrendChart,
	PlantTrendDataItem,
	PlantTrendList,
	TrendPoint
} from '$features/trends';
import { chartValueDomain } from '$shared/utils/chart';

/**
 * Model tampilan grafik Tren & Grafik per PLTA (`GET /trends/plta/{id}/data`).
 *
 * Satu grafik = satu `grafik[]` dari server: item segrup digambar bersama, dan
 * tiap item bisa punya lebih dari satu deret (metrik per stasiun). Fungsi di
 * sini murni sehingga dapat diuji tanpa merender grafik.
 */

export interface TrendChartOption {
	/** Nilai `?grafik=`: kunci metrik item pertama grafik itu, mis. `tma_waduk`. */
	value: string;
	label: string;
	chart: PlantTrendChart;
}

/**
 * Pilihan grafik untuk pemilih, urut daftar admin. Satu pilihan = satu grafik
 * server, jadi pengelompokan admin tetap berlaku.
 *
 * Grafik tidak punya id sendiri; kunci metrik dipakai karena unik dalam satu
 * daftar dan terbaca di URL. Grafik tanpa item yang dikenal dilewati.
 */
export function trendChartOptions(list: PlantTrendList): TrendChartOption[] {
	const keyById = new Map(list.items.map((item) => [item.id, item.key]));

	return list.charts.flatMap((chart) => {
		const key = chart.itemIds.map((id) => keyById.get(id)).find((value) => value !== undefined);
		return key ? [{ value: key, label: chart.title, chart }] : [];
	});
}

/**
 * Grafik untuk `?grafik=`. Dicari lewat kunci metrik mana pun di grafik —
 * bukan hanya item pertama — supaya tautan lama tetap kena walau admin
 * mengubah urutan di dalam grup.
 *
 * Tanpa kunci (atau kunci tak dikenal), bawaannya grafik pertama yang memuat
 * data sensor (`measured`), baru grafik pertama bila tidak ada. Item `plan`
 * dan `derived` sering kosong — Target TMA, misalnya, menunggu isian manual —
 * dan dulu membuka halaman berarti menatap kotak "Belum ada data" padahal
 * TMA Waduk tepat di bawahnya berdata. Data tiap grafik baru diminta setelah
 * dipilih, jadi sumber item adalah petunjuk terbaik yang sudah tersedia.
 */
export function selectTrendChart(
	list: PlantTrendList,
	options: readonly TrendChartOption[],
	key: string | null
): TrendChartOption | undefined {
	if (key) {
		const itemId = list.items.find((item) => item.key === key)?.id;
		const match = itemId && options.find((option) => option.chart.itemIds.includes(itemId));
		if (match) return match;
	}

	const measuredIds = new Set(
		list.items.filter((item) => item.source === 'measured').map((item) => item.id)
	);
	return (
		options.find((option) => option.chart.itemIds.some((id) => measuredIds.has(id))) ?? options[0]
	);
}

export const TREND_SERIES_COLORS = [
	'var(--color-chart-series-1)',
	'var(--color-chart-series-2)',
	'var(--color-chart-series-3)',
	'var(--color-chart-series-4)',
	'var(--color-chart-series-5)',
	'var(--color-chart-series-6)'
];

export type TrendAxis = 'left' | 'right';

export interface TrendSeriesStats {
	latest: TrendPoint;
	average: number;
	minimum: number;
	maximum: number;
}

export interface TrendSeriesView {
	/** Unik dalam satu grafik: `<id item>:<indeks deret>`. */
	id: string;
	/** Kunci metrik item asalnya, mis. `tma_waduk`. */
	itemKey: string;
	name: string;
	unit: string | null;
	color: string;
	/** Satuan kedua dalam grup digambar di sumbu kanan. */
	axis: TrendAxis;
	/** `sumber: plan` = satu nilai per tanggal; digambar sebagai garis tangga. */
	isStep: boolean;
	isRainfall: boolean;
	points: TrendPoint[];
	stats: TrendSeriesStats | null;
	isTruncated: boolean;
}

export interface TrendChartDatum {
	time: Date;
	iso: string;
	/** Nilai asli per id deret; tidak ada kunci = tidak ada titik pada waktu ini. */
	values: Record<string, number>;
	/** Nilai periode pembanding (sudah digeser ke waktu periode ini). */
	compare: Record<string, number>;
}

export interface TrendChartView {
	title: string;
	series: TrendSeriesView[];
	leftUnit: string | null;
	rightUnit: string | null;
	leftDomain: [number, number];
	rightDomain: [number, number] | null;
	/** Hanya satu deret curah hujan: digambar sebagai batang. */
	isBarChart: boolean;
	hasData: boolean;
	/** Item yang belum berdata pada rentang ini — tampil "belum ada data", bukan nol. */
	emptyItems: string[];
	data: TrendChartDatum[];
}

function isRainfallKey(key: string): boolean {
	return key.startsWith('curah_hujan');
}

function seriesStats(points: TrendPoint[]): TrendSeriesStats | null {
	if (points.length === 0) return null;
	const values = points.map((point) => point.value);
	return {
		latest: points[points.length - 1],
		average: values.reduce((total, value) => total + value, 0) / values.length,
		minimum: Math.min(...values),
		maximum: Math.max(...values)
	};
}

/**
 * Titik sudut garis tangga: nilai lama dipertahankan sampai tepat sebelum
 * titik berikutnya. Kurva `step` d3 tidak dipakai karena `d3-shape` bukan
 * dependensi langsung project ini; hasilnya sama.
 */
export function stepPoints(points: TrendPoint[]): TrendPoint[] {
	return points.flatMap((point, index) => {
		const previous = points[index - 1];
		if (!previous) return [point];
		return [{ ...previous, time: point.time }, point];
	});
}

function axisDomain(series: TrendSeriesView[], fromZero: boolean): [number, number] {
	const values = series.flatMap((item) => item.points.map((point) => point.value));
	const domain = chartValueDomain(values);
	return fromZero ? [Math.min(0, domain[0]), domain[1]] : domain;
}

export function buildTrendChart(
	chart: PlantTrendChart,
	itemsById: ReadonlyMap<string, PlantTrendDataItem>,
	comparison?: { itemsById: ReadonlyMap<string, PlantTrendDataItem>; offsetMs: number }
): TrendChartView {
	const items = chart.itemIds
		.map((id) => itemsById.get(id))
		.filter((item): item is PlantTrendDataItem => item !== undefined);

	// Satuan pertama di sumbu kiri, satuan kedua (server menolak grup > 2 satuan) di kanan.
	const units = [...new Set(items.map((item) => item.unit ?? ''))];
	const leftUnit = units[0] || null;
	const rightUnit = units.length > 1 ? units[1] || null : null;

	let colorIndex = 0;
	const series: TrendSeriesView[] = items.flatMap((item) =>
		item.series.map((deret, index) => {
			const isStep = item.source === 'plan';
			const name =
				item.series.length > 1 ? `${item.label} · ${deret.name || deret.station}` : item.label;
			const view: TrendSeriesView = {
				id: `${item.id}:${index}`,
				itemKey: item.key,
				name,
				unit: item.unit,
				color: TREND_SERIES_COLORS[colorIndex % TREND_SERIES_COLORS.length],
				axis: rightUnit !== null && (item.unit ?? '') === units[1] ? 'right' : 'left',
				isStep,
				isRainfall: isRainfallKey(item.key),
				points: deret.points,
				stats: seriesStats(deret.points),
				isTruncated: deret.isTruncated
			};
			colorIndex += 1;
			return view;
		})
	);

	const isBarChart = series.length === 1 && series[0].isRainfall;

	const byTime = new Map<number, TrendChartDatum>();
	const datumAt = (time: number): TrendChartDatum => {
		const existing = byTime.get(time);
		if (existing) return existing;
		const created = {
			time: new Date(time),
			iso: new Date(time).toISOString(),
			values: {},
			compare: {}
		};
		byTime.set(time, created);
		return created;
	};

	for (const view of series) {
		const drawn = view.isStep ? stepPoints(view.points) : view.points;
		for (const point of drawn) datumAt(Date.parse(point.time)).values[view.id] = point.value;
	}

	if (comparison) {
		for (const item of items) {
			const compared = comparison.itemsById.get(item.id);
			compared?.series.forEach((deret, index) => {
				const id = `${item.id}:${index}`;
				const isStep = item.source === 'plan';
				for (const point of isStep ? stepPoints(deret.points) : deret.points) {
					datumAt(Date.parse(point.time) + comparison.offsetMs).compare[id] = point.value;
				}
			});
		}
	}

	return {
		title: chart.title,
		series,
		leftUnit,
		rightUnit,
		leftDomain: axisDomain(
			series.filter((view) => view.axis === 'left'),
			isBarChart
		),
		rightDomain:
			rightUnit === null
				? null
				: axisDomain(
						series.filter((view) => view.axis === 'right'),
						false
					),
		isBarChart,
		hasData: series.some((view) => view.points.length > 0),
		emptyItems: items.filter((item) => !item.hasData).map((item) => item.label),
		data: [...byTime.values()].sort((first, second) => first.time.getTime() - second.time.getTime())
	};
}

/**
 * Pemetaan linear nilai sumbu kanan ke ruang sumbu kiri. Satu `Chart` hanya
 * punya satu skala Y, jadi deret bersatuan kedua digambar dalam ruang sumbu
 * kiri dan label sumbu kanannya dipetakan balik. Tooltip tetap membaca nilai
 * aslinya dari `values`.
 */
export function axisMapping(left: [number, number], right: [number, number]) {
	const leftSpan = left[1] - left[0] || 1;
	const rightSpan = right[1] - right[0] || 1;
	return {
		toLeft: (value: number) => left[0] + ((value - right[0]) / rightSpan) * leftSpan,
		toRight: (value: number) => right[0] + ((value - left[0]) / leftSpan) * rightSpan
	};
}

/**
 * Nilai deret pada waktu `time` untuk tooltip: garis tangga memakai nilai
 * terakhir yang berlaku, deret lain hanya bila ada titik tepat di waktu itu.
 */
export function valueAt(view: TrendSeriesView, time: number): number | undefined {
	if (!view.isStep) {
		return view.points.find((point) => Date.parse(point.time) === time)?.value;
	}
	let current: number | undefined;
	for (const point of view.points) {
		if (Date.parse(point.time) > time) break;
		current = point.value;
	}
	return current;
}

/**
 * Garis acuan per metrik: batas yang memberi arti pada angka TMA. Nilainya
 * dibaca dari panel Hidrologi Harian hari ini (konstanta PLTA yang diisi
 * operator), bukan dari daftar tren — admin tidak perlu memasukkannya ke
 * grafik supaya ikut tampil.
 */
export const TREND_REFERENCE_KEYS: Readonly<Record<string, readonly string[]>> = {
	tma_waduk: ['batas_tma_limpas', 'batas_tma_mol'],
	tma_tailrace: ['batas_tma_hilir_maks']
};

export interface TrendReferenceSource {
	label: string;
	value: number | null;
	unit: string | null;
}

export interface TrendReference {
	key: string;
	label: string;
	value: number;
	unit: string | null;
	/** Digambar sebagai garis; batas yang jauh hanya tampil di keterangan. */
	isOnChart: boolean;
	/** Batas − nilai terkini deret acuannya; positif = batas di atas. */
	distanceFromLatest: number | null;
}

/** Kunci batas yang perlu dibaca untuk grafik berisi metrik `itemKeys`. */
export function trendReferenceKeys(itemKeys: readonly string[]): string[] {
	return [...new Set(itemKeys.flatMap((key) => TREND_REFERENCE_KEYS[key] ?? []))];
}

/**
 * Menempelkan batas ke grafik. Batas yang dekat dengan datanya — paling jauh
 * selebar rentang data itu sendiri — dimasukkan ke sumbu dan digambar. Batas
 * yang lebih jauh tidak: TMA Soedirman bergerak 0,3 m dalam seminggu sementara
 * MOL 4,5 m di bawahnya, dan memaksanya masuk sumbu akan meratakan garis TMA.
 * Jaraknya ke nilai terkini tetap tertulis di keterangan.
 *
 * Hanya untuk satuan sumbu kiri: deret acuan TMA selalu satuan pertama grafik.
 */
export function withTrendReferences(
	chart: TrendChartView,
	lookup: (key: string) => TrendReferenceSource | null
): { chart: TrendChartView; references: TrendReference[] } {
	if (!chart.hasData) return { chart, references: [] };

	const [low, high] = chart.leftDomain;
	const span = high - low || 1;
	let domain: [number, number] = [low, high];
	const references: TrendReference[] = [];

	const leftSeries = chart.series.filter((view) => view.axis === 'left');
	const itemKeys = [...new Set(leftSeries.map((view) => view.itemKey))];

	itemKeys.forEach((itemKey) => {
		const latest =
			leftSeries.find((view) => view.itemKey === itemKey && view.stats)?.stats?.latest.value ??
			null;
		for (const key of TREND_REFERENCE_KEYS[itemKey] ?? []) {
			const source = lookup(key);
			if (!source || source.value === null || !Number.isFinite(source.value)) continue;
			if (source.unit && chart.leftUnit && source.unit !== chart.leftUnit) continue;

			const isOnChart = source.value >= low - span && source.value <= high + span;
			if (isOnChart) {
				const pad = span * 0.06;
				domain = [Math.min(domain[0], source.value - pad), Math.max(domain[1], source.value + pad)];
			}
			references.push({
				key,
				label: source.label,
				value: source.value,
				unit: source.unit ?? chart.leftUnit,
				isOnChart,
				distanceFromLatest: latest === null ? null : source.value - latest
			});
		}
	});

	return { chart: { ...chart, leftDomain: domain }, references };
}
