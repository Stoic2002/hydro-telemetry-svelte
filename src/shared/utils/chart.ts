import { scaleLinear } from 'd3-scale';
import type { TimeInterval } from 'd3-time';
import { formatDayMonthTimeWIB, formatDayMonthWIB, formatTimeWIB } from '$shared/lib/date';

/**
 * Rentang sumbu Y untuk grafik nilai terukur.
 *
 * Recharts memaku sumbu Y di nol kalau domain tidak diberikan. Untuk parameter
 * yang nilainya jauh di atas nol — inflow, TMA waduk — seluruh garis jadi
 * menumpuk di pinggir atas dan tidak lagi terbaca terhadap garis bantunya.
 */
export function chartValueDomain(values: number[], minimumSpan = 0): [number, number] {
	const finiteValues = values.filter((value) => Number.isFinite(value));
	if (finiteValues.length === 0) return [0, 1];

	const minimumValue = Math.min(...finiteValues);
	const maximumValue = Math.max(...finiteValues);
	const valueRange = maximumValue - minimumValue;

	// Rentang datar tetap perlu ruang agar garisnya tidak menempel di tepi, tapi
	// padding-nya tidak boleh sampai menenggelamkan datanya sendiri. Satuan yang
	// punya rentang minimum (mdpl) memakai rentang itu: 2% dari TMA 223 mdpl
	// = ±4,5 m, cukup lebar untuk menyeret garis MOL 4,8 m di bawahnya masuk
	// grafik 24 jam dan meratakan garis TMA (temuan QA T13, 4 Nov 2026).
	const flatPadding =
		minimumSpan > 0 ? minimumSpan / 2 : Math.max(Math.abs(maximumValue) * 0.02, 0.5);
	const padding = valueRange > 0 ? valueRange * 0.12 : flatPadding;

	const low = minimumValue >= 0 ? Math.max(0, minimumValue - padding) : minimumValue - padding;
	const high = maximumValue + padding;
	if (high - low >= minimumSpan) return [low, high];

	// Rentang terlalu sempit untuk satuannya: dilebarkan di sekitar titik tengah
	// data, supaya derau beberapa sentimeter tidak tampak seperti gejolak besar.
	const middle = (minimumValue + maximumValue) / 2;
	const widenedLow =
		minimumValue >= 0 ? Math.max(0, middle - minimumSpan / 2) : middle - minimumSpan / 2;
	return [widenedLow, widenedLow + minimumSpan];
}

/**
 * Rentang sumbu Y paling sempit per satuan. TMA (mdpl) bergerak beberapa
 * sentimeter per jam; tanpa batas bawah, 4 cm digambar setinggi grafik dan
 * derau sensor terbaca sebagai naik-turun drastis (keputusan tim 17 Okt 2026:
 * 0,2 m). Satuan lain — debit, curah hujan — tetap mengikuti datanya.
 */
const MINIMUM_AXIS_SPAN: Readonly<Record<string, number>> = { mdpl: 0.2 };

export function minimumAxisSpan(unit: string | null | undefined): number {
	if (!unit) return 0;
	return MINIMUM_AXIS_SPAN[unit.trim().toLowerCase()] ?? 0;
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

/** Jarak antartitik yang dipakai bila datanya hanya satu titik. */
const FALLBACK_BAR_STEP_MS = 60 * 60 * 1_000;

/**
 * Interval x untuk grafik batang di sumbu waktu.
 *
 * Di skala waktu, LayerChart hanya bisa menghitung lebar batang bila `Chart`
 * diberi `xInterval`; tanpa itu setiap `<rect>` berukuran 0×0 dan grafik curah
 * hujan tampil kosong walau datanya ada (temuan QA 4 Nov 2026). Interval ini
 * tidak membulatkan waktu — titik dari server sudah tepat di awal periodenya
 * (jam atau hari WIB) — dan lebarnya jarak antartitik terkecil, jadi berlaku
 * untuk resolusi apa pun tanpa perlu tahu resolusinya. Bentuknya cukup
 * `floor` dan `offset`, satu-satunya yang dibaca LayerChart, sehingga
 * `d3-time` tidak perlu jadi dependensi langsung.
 */
export function barTimeInterval(times: readonly Date[]): TimeInterval {
	const sorted = times.map((time) => time.getTime()).sort((a, b) => a - b);
	let stepMs = Number.POSITIVE_INFINITY;
	for (let index = 1; index < sorted.length; index += 1) {
		const gap = sorted[index] - sorted[index - 1];
		if (gap > 0 && gap < stepMs) stepMs = gap;
	}
	if (!Number.isFinite(stepMs)) stepMs = FALLBACK_BAR_STEP_MS;

	const interval = {
		floor: (date: Date) => new Date(date.getTime()),
		offset: (date: Date, step = 1) => new Date(date.getTime() + step * stepMs)
	};
	return interval as unknown as TimeInterval;
}

/**
 * Pemetaan linear nilai sumbu kanan ke ruang sumbu kiri. Satu `Chart` hanya
 * punya satu skala Y, jadi deret bersatuan atau berskala kedua digambar dalam
 * ruang sumbu kiri dan label sumbu kanannya dipetakan balik. Tooltip tetap
 * membaca nilai aslinya. Dipakai Tren & Grafik (satuan kedua) dan grafik energi
 * Hidrologi Bulanan (akumulasi di kanan, energi bulanan di kiri).
 */
export function axisMapping(left: [number, number], right: [number, number]) {
	const leftSpan = left[1] - left[0] || 1;
	const rightSpan = right[1] - right[0] || 1;
	return {
		toLeft: (value: number) => left[0] + ((value - right[0]) / rightSpan) * leftSpan,
		toRight: (value: number) => right[0] + ((value - left[0]) / leftSpan) * rightSpan
	};
}
