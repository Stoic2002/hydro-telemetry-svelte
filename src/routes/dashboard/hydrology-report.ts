import type { HydrologyPeriod, MonthlyHydrologyOverview } from '$features/hydrology';
import { MONTHS } from './plta/[pltaId]/telemetering/presentation';

/**
 * Aturan murni laporan hidrologi seluruh PLTA — dipakai tab Laporan Hidrologi
 * di menu Laporan dan ringkasan seluruh PLTA di Overview. Dulu keduanya satu halaman
 * (Telemetering › Rekap Hidrologi).
 *
 * Dipisah dari komponen karena ketiganya bisa salah tanpa gejala di layar:
 * periode yang terbaca keliru, nama berkas yang bertabrakan, dan — paling
 * berbahaya — status gabungan yang menyatakan "Tercapai" padahal belum.
 */

export const ALL_MONTHS = 'semua';
export const ALL_PLANTS = 'semua';
export const ALL_PANELS = 'semua';
/** Nilai pilihan "tanpa rentang" pada pemilih akhir periode. */
export const NO_RANGE = 'tanpa';
/** Batas server: rentang lebih panjang ditolak dengan 400. */
export const MAX_RANGE_MONTHS = 60;

const MIN_YEAR = 2000;
const MAX_YEAR = 2200;

/*
 * Pilihan periode bersama Overview dan tab Laporan Hidrologi. Satu sumber,
 * supaya kedua layar menawarkan tahun dan aturan rentang yang sama.
 */
const CURRENT_YEAR = new Date().getFullYear();
const MONTH_ITEMS = MONTHS.map((label, index) => ({ value: String(index + 1), label }));

export const REPORT_MONTH_OPTIONS = [
	{ value: ALL_MONTHS, label: 'Sepanjang tahun' },
	...MONTH_ITEMS
];
export const REPORT_YEAR_OPTIONS = Array.from(
	{ length: 6 },
	(_, index) => CURRENT_YEAR + 1 - index
).map((value) => ({ value: String(value), label: String(value) }));
/** Akhir rentang opsional: "—" berarti tanpa rentang (satu periode saja). */
export const REPORT_END_MONTH_OPTIONS = [{ value: NO_RANGE, label: '—' }, ...MONTH_ITEMS];
export const REPORT_END_YEAR_OPTIONS = [{ value: NO_RANGE, label: '—' }, ...REPORT_YEAR_OPTIONS];

/**
 * Query string berikutnya setelah beberapa parameter diubah SEKALIGUS — dua
 * `goto` berturut-turut sama-sama membaca URL lama, sehingga yang kedua
 * mengembalikan perubahan yang pertama. `NO_RANGE` (dan `plta` = seluruh PLTA)
 * menghapus parameternya, bukan menuliskannya.
 */
export function nextReportSearch(
	current: URLSearchParams,
	changes: Partial<Record<string, string>>
): string {
	const params = new URLSearchParams(current);
	for (const [key, value] of Object.entries(changes)) {
		if (value === undefined) continue;
		if (value === NO_RANGE || (key === 'plta' && value === ALL_PLANTS)) params.delete(key);
		else params.set(key, value);
	}
	return `?${params.toString()}`;
}

/** Tahun dari `?tahun=`. Di luar batas server dianggap tidak dipilih. */
export function parseReportYear(value: string | null, currentYear: number): number {
	const year = Number(value);
	return Number.isInteger(year) && year >= MIN_YEAR && year <= MAX_YEAR ? year : currentYear;
}

/**
 * Bulan dari `?bulan=`. `undefined` berarti sepanjang tahun — itulah sebabnya
 * "sepanjang tahun" perlu nilai eksplisit (`semua`) dan tidak boleh diwakili
 * parameter yang hilang: tanpa `?bulan=` sama sekali, yang dimaksud bulan
 * berjalan.
 */
export function parseReportMonth(value: string | null, currentMonth: number): number | undefined {
	if (value === ALL_MONTHS) return undefined;

	const month = Number(value);
	return value && Number.isInteger(month) && month >= 1 && month <= 12 ? month : currentMonth;
}

/** Tahun akhir dari `?tahun_akhir=`; `undefined` = tanpa rentang. */
export function parseReportEndYear(value: string | null): number | undefined {
	const year = Number(value);
	return value && Number.isInteger(year) && year >= MIN_YEAR && year <= MAX_YEAR ? year : undefined;
}

/** Bulan akhir dari `?bulan_akhir=`; `undefined` = ikut aturan bawaan server. */
export function parseReportEndMonth(value: string | null): number | undefined {
	const month = Number(value);
	return value && Number.isInteger(month) && month >= 1 && month <= 12 ? month : undefined;
}

/**
 * Rentang yang sungguh dimaksud server: `bulan` kosong = Januari, tahun akhir
 * kosong = tahun awal, bulan akhir kosong = `bulan` (satu bulan) atau Desember
 * bila `bulan` juga kosong. Dipakai untuk label, validasi, dan nama berkas
 * supaya ketiganya sepakat dengan server.
 */
export function resolveReportRange(period: HydrologyPeriod) {
	return {
		startYear: period.year,
		startMonth: period.month ?? 1,
		endYear: period.endYear ?? period.year,
		endMonth: period.endMonth ?? period.month ?? 12
	};
}

/** `2026-09` → `September 2026`; `null` bila bentuknya tidak dikenal. */
export function formatReportMonthKey(value: string | null): string | null {
	const match = value ? /^(\d{4})-(\d{2})$/.exec(value) : null;
	if (!match) return null;
	const month = Number(match[2]);
	return month >= 1 && month <= 12 ? `${MONTHS[month - 1]} ${match[1]}` : null;
}

/** Tahun dan bulan berjalan: bawaan pemilih periode bila URL tidak menyebutnya. */
export function currentReportPeriod(now = new Date()): { year: number; month: number } {
	return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/** Bulan sebelum (`year`, `month`); Januari mundur ke Desember tahun lalu. */
export function previousReportMonth(year: number, month: number): { year: number; month: number } {
	return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

/** Jumlah bulan dalam rentang, inklusif; nol atau negatif berarti terbalik. */
export function reportRangeMonthCount(period: HydrologyPeriod): number {
	const { startYear, startMonth, endYear, endMonth } = resolveReportRange(period);
	return (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
}

/** Apakah operator memilih rentang (akhir periode disebut eksplisit). */
export function hasReportRange(period: HydrologyPeriod): boolean {
	return period.endYear !== undefined || period.endMonth !== undefined;
}

/**
 * Pesan untuk rentang yang pasti ditolak server, supaya permintaannya tidak
 * dikirim sia-sia. Tanpa rentang selalu sah.
 */
export function reportRangeError(period: HydrologyPeriod): string | null {
	if (!hasReportRange(period)) return null;

	const count = reportRangeMonthCount(period);
	if (count < 1) return 'Akhir rentang tidak boleh sebelum awal rentang.';
	if (count > MAX_RANGE_MONTHS) return `Rentang maksimal ${MAX_RANGE_MONTHS} bulan.`;
	return null;
}

export function reportPeriodLabel(
	year: number,
	month: number | undefined,
	endYear?: number,
	endMonth?: number
): string {
	if (endYear === undefined && endMonth === undefined) {
		return month ? `${MONTHS[month - 1]} ${year}` : `Tahun ${year}`;
	}

	const range = resolveReportRange({ year, month, endYear, endMonth });
	const start = `${MONTHS[range.startMonth - 1]} ${range.startYear}`;
	const end = `${MONTHS[range.endMonth - 1]} ${range.endYear}`;
	return start === end ? start : `${start} – ${end}`;
}

/**
 * `laporan-hidrologi-harian-2026-09-hulu-sdr.xlsx` — periode, panel, dan
 * cakupan terbaca dari nama berkas, supaya dua unduhan berbeda tidak pernah
 * tersimpan dengan nama sama.
 */
export function reportFilename(input: {
	kind: 'bulanan' | 'harian';
	year: number;
	month?: number;
	endYear?: number;
	endMonth?: number;
	panel?: string;
	plantCode?: string;
}): string {
	const isRange = input.endYear !== undefined || input.endMonth !== undefined;
	const range = isRange ? resolveReportRange(input) : undefined;
	const pad = (value: number) => String(value).padStart(2, '0');
	const parts = [
		'laporan-hidrologi',
		input.kind,
		range ? `${range.startYear}-${pad(range.startMonth)}` : String(input.year),
		range
			? `sd-${range.endYear}-${pad(range.endMonth)}`
			: input.month
				? pad(input.month)
				: undefined,
		input.panel,
		input.plantCode?.toLowerCase()
	];

	return `${parts.filter(Boolean).join('-')}.xlsx`;
}

/**
 * Status gabungan seluruh PLTA. Mengikuti aturan backend per data: **prediksi ≥ target**,
 * bukan persentase ≥ 100 — `prosentase` dibulatkan dua desimal, sehingga
 * 99,996% terbaca `100.0` dan akan dilaporkan tercapai padahal kurang.
 *
 * `null` bila periodenya belum bisa dinilai.
 */
export function isFleetAchieved(overview: MonthlyHydrologyOverview): boolean | null {
	// Blok akumulasi: itulah yang selama ini menjadi angka utama ringkasan.
	const { aggregatePercent, totalPredictedMwh, totalTargetMwh } = overview.accumulated;
	if (aggregatePercent === null) return null;

	return totalPredictedMwh >= totalTargetMwh;
}

/**
 * Berapa PLTA terdaftar yang belum punya data periode ini. Backend meminta
 * cakupan diperiksa sebelum angkanya dibaca sebagai angka gabungan.
 */
export function missingPlantCount(
	overview: MonthlyHydrologyOverview,
	registeredPlantCount: number | null
): number {
	if (registeredPlantCount === null) return 0;

	return Math.max(0, registeredPlantCount - overview.plantCount);
}
