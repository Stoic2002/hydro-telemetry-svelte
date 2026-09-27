import type { TrendSeries } from '$features/trends';
import { formatDayMonthWIB, formatDayMonthYearWIB } from '$shared/lib/date';

/**
 * Pembanding periode untuk grafik Tren. Satu grafik tetap satu grafik — garis
 * pembanding ditumpuk di sumbu waktu yang sama, bukan grafik kedua.
 */
export const TREND_COMPARISONS = [
	{ value: 'none', label: 'Tanpa pembanding' },
	{ value: 'previous', label: 'Periode sebelumnya' },
	{ value: 'last-year', label: 'Tahun lalu' }
] as const;

export type TrendComparison = (typeof TREND_COMPARISONS)[number]['value'];

export function isTrendComparison(value: string | null): value is TrendComparison {
	return TREND_COMPARISONS.some((option) => option.value === value);
}

export interface TimeRange {
	from: string;
	to: string;
}

/**
 * Jarak geser periode pembanding, dalam milidetik.
 *
 * "Tahun lalu" digeser satu tahun kalender dari ujung rentang, bukan 365 hari
 * tetap: rentang yang melewati 29 Februari tetap jatuh di tanggal yang sama.
 * Keduanya kelipatan hari utuh, jadi ember `1h` dan `1d` (hari WIB) di kedua
 * periode tetap sejajar dan bisa digabung per waktu.
 */
export function comparisonOffsetMs(comparison: TrendComparison, range: TimeRange): number {
	const to = Date.parse(range.to);
	if (comparison === 'previous') return to - Date.parse(range.from);
	if (comparison === 'last-year') {
		const lastYear = new Date(to);
		lastYear.setUTCFullYear(lastYear.getUTCFullYear() - 1);
		return to - lastYear.getTime();
	}
	return 0;
}

export function shiftRange(range: TimeRange, offsetMs: number): TimeRange {
	return {
		from: new Date(Date.parse(range.from) - offsetMs).toISOString(),
		to: new Date(Date.parse(range.to) - offsetMs).toISOString()
	};
}

/** Label rentang untuk legenda, mis. "24–25 Sep 2025". */
export function formatRangeLabel(range: TimeRange, withYear: boolean): string {
	// Ujung rentang eksklusif; tampilkan hari terakhir yang benar-benar tercakup.
	const lastIncluded = new Date(Date.parse(range.to) - 1).toISOString();
	const start = formatDayMonthWIB(range.from);
	const end = withYear ? formatDayMonthYearWIB(lastIncluded) : formatDayMonthWIB(lastIncluded);
	return start === formatDayMonthWIB(lastIncluded) ? end : `${start} – ${end}`;
}

export interface TrendChartDatum {
	time: Date;
	iso: string;
	value?: number;
	/** Nilai periode pembanding pada posisi waktu yang sama. */
	compare?: number;
	/** Waktu asli titik pembanding, untuk tooltip. */
	compareIso?: string;
}

/**
 * Menggabungkan periode ini dan periode pembanding ke satu sumbu waktu. Titik
 * pembanding digeser maju sejauh `offsetMs` sehingga jatuh di posisi yang
 * sebanding dengan titik periode ini.
 */
export function mergeWithComparison(
	current: TrendSeries['points'],
	comparison: TrendSeries['points'],
	offsetMs: number
): TrendChartDatum[] {
	const merged = new Map<number, TrendChartDatum>();

	for (const point of current) {
		const time = Date.parse(point.time);
		merged.set(time, { time: new Date(time), iso: point.time, value: point.value });
	}

	for (const point of comparison) {
		const time = Date.parse(point.time) + offsetMs;
		const datum = merged.get(time) ?? { time: new Date(time), iso: new Date(time).toISOString() };
		datum.compare = point.value;
		datum.compareIso = point.time;
		merged.set(time, datum);
	}

	return [...merged.values()].sort((left, right) => left.time.getTime() - right.time.getTime());
}

export function averageOf(values: number[]): number | null {
	return values.length > 0
		? values.reduce((total, value) => total + value, 0) / values.length
		: null;
}
