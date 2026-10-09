import { scaleLinear } from 'd3-scale';
import { formatDayMonthTimeWIB, formatDayMonthWIB, formatTimeWIB } from '$shared/lib/date';

/**
 * Rentang sumbu Y untuk grafik nilai terukur.
 *
 * Recharts memaku sumbu Y di nol kalau domain tidak diberikan. Untuk parameter
 * yang nilainya jauh di atas nol — inflow, TMA waduk — seluruh garis jadi
 * menumpuk di pinggir atas dan tidak lagi terbaca terhadap garis bantunya.
 */
export function chartValueDomain(values: number[]): [number, number] {
	const finiteValues = values.filter((value) => Number.isFinite(value));
	if (finiteValues.length === 0) return [0, 1];

	const minimumValue = Math.min(...finiteValues);
	const maximumValue = Math.max(...finiteValues);
	const valueRange = maximumValue - minimumValue;

	// Rentang datar tetap perlu ruang agar garisnya tidak menempel di tepi, tapi
	// padding-nya tidak boleh sampai menenggelamkan datanya sendiri.
	const padding = valueRange > 0 ? valueRange * 0.12 : Math.max(Math.abs(maximumValue) * 0.02, 0.5);

	return [
		minimumValue >= 0 ? Math.max(0, minimumValue - padding) : minimumValue - padding,
		maximumValue + padding
	];
}

/**
 * Tick sumbu nilai dan jumlah desimal yang cukup untuk membedakan tick yang
 * bertetangga. Desimalnya ditentukan dari JARAK antar-tick, bukan dari besar
 * angkanya: TMA 223,10–223,30 bertick tiap 0,05, dan memotongnya ke nol
 * desimal (aturan lama "≥ 100 → bulat") membuat seluruh label terbaca "223".
 */
export function valueAxisTicks(
	domain: [number, number],
	count = 5
): { ticks: number[]; fractionDigits: number } {
	const ticks = scaleLinear().domain(domain).ticks(count);
	if (ticks.length < 2) return { ticks, fractionDigits: 0 };

	const step = Math.abs(ticks[1] - ticks[0]);
	// `1e-9` menahan galat pembulatan biner: log10(0,1) = -0,99999… bukan -1.
	const fractionDigits = Math.min(4, Math.max(0, -Math.floor(Math.log10(step) + 1e-9)));
	return { ticks, fractionDigits };
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Tengah malam WIB (UTC+7, tanpa musim panas). */
function isMidnightWIB(date: Date): boolean {
	return (date.getTime() + 7 * HOUR_MS) % DAY_MS === 0;
}

/**
 * Format label sumbu waktu menurut lebar rentang yang digambar. Rentang
 * sehari bertick tiap beberapa jam, dan label tanggal saja (aturan lama)
 * membuat semua tick terbaca "07 Okt". Tick tengah malam tetap memakai tanggal
 * supaya pergantian hari terlihat.
 */
export function timeAxisFormatter(spanMs: number): (date: Date) => string {
	return (date) => {
		if (isMidnightWIB(date) || spanMs > 8 * DAY_MS) return formatDayMonthWIB(date);
		return spanMs <= 26 * HOUR_MS ? formatTimeWIB(date) : formatDayMonthTimeWIB(date);
	};
}
