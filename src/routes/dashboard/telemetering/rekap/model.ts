import type { MonthlyHydrologyOverview } from '$features/hydrology';
import { MONTHS } from '../../plta/[pltaId]/telemetering/presentation';

/**
 * Aturan murni halaman Rekap Hidrologi.
 *
 * Dipisah dari komponen karena ketiganya bisa salah tanpa gejala di layar:
 * periode yang terbaca keliru, nama berkas yang bertabrakan, dan — paling
 * berbahaya — status armada yang menyatakan "Tercapai" padahal belum.
 */

export const ALL_MONTHS = 'semua';
export const ALL_PLANTS = 'semua';
export const ALL_PANELS = 'semua';

const MIN_YEAR = 2000;
const MAX_YEAR = 2200;

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

export function reportPeriodLabel(year: number, month: number | undefined): string {
	return month ? `${MONTHS[month - 1]} ${year}` : `Tahun ${year}`;
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
	panel?: string;
	plantCode?: string;
}): string {
	const parts = [
		'laporan-hidrologi',
		input.kind,
		String(input.year),
		input.month ? String(input.month).padStart(2, '0') : undefined,
		input.panel,
		input.plantCode?.toLowerCase()
	];

	return `${parts.filter(Boolean).join('-')}.xlsx`;
}

/**
 * Status armada. Mengikuti aturan backend per baris: **prediksi ≥ target**,
 * bukan persentase ≥ 100 — `prosentase` dibulatkan dua desimal, sehingga
 * 99,996% terbaca `100.0` dan akan dilaporkan tercapai padahal kurang.
 *
 * `null` bila periodenya belum bisa dinilai.
 */
export function isFleetAchieved(overview: MonthlyHydrologyOverview): boolean | null {
	if (overview.aggregateAchievementPercent === null) return null;

	return overview.totalPredictedAchievementMwh >= overview.totalTargetAchievementMwh;
}

/**
 * Berapa PLTA terdaftar yang belum punya data periode ini. Backend meminta
 * cakupan diperiksa sebelum angkanya dibaca sebagai angka armada.
 */
export function missingPlantCount(
	overview: MonthlyHydrologyOverview,
	registeredPlantCount: number | null
): number {
	if (registeredPlantCount === null) return 0;

	return Math.max(0, registeredPlantCount - overview.plantCount);
}
