/** Batas server untuk Excel time-series 13 kolom (deprecated); lebih panjang ditolak 400. */
export const MAX_TIMESERIES_DAYS = 62;

/**
 * Batas Excel data tren (`…/data.xlsx`) yang dipakai FE. Server membatasi
 * 100.000 baris; per jam itu ±11 tahun, tetapi berkas sebesar itu tidak
 * berguna dibuka di Excel — satu tahun cukup dan tetap jauh di bawah batas.
 */
export const MAX_TREND_EXPORT_DAYS = 366;

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDate(value: string): number | null {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
	const time = Date.parse(`${value}T00:00:00Z`);
	return Number.isNaN(time) ? null : time;
}

/** Jumlah hari inklusif antara dua tanggal `YYYY-MM-DD`; `null` bila tidak sah. */
export function timeseriesRangeDays(start: string, end: string): number | null {
	const from = parseDate(start);
	const to = parseDate(end);
	if (from === null || to === null) return null;
	return Math.round((to - from) / DAY_MS) + 1;
}

/**
 * Pesan untuk rentang yang pasti ditolak server, supaya permintaannya tidak
 * dikirim sia-sia. `null` = sah.
 */
export function timeseriesRangeError(
	start: string,
	end: string,
	maxDays: number = MAX_TIMESERIES_DAYS
): string | null {
	const days = timeseriesRangeDays(start, end);
	if (days === null) return 'Isi tanggal awal dan akhir.';
	if (days < 1) return 'Tanggal akhir tidak boleh sebelum tanggal awal.';
	if (days > maxDays) return `Rentang maksimal ${maxDays} hari.`;
	return null;
}

/** `YYYY-MM-DD` digeser `days` hari (boleh negatif). */
export function shiftIsoDate(value: string, days: number): string {
	const time = parseDate(value);
	if (time === null) return value;
	return new Date(time + days * DAY_MS).toISOString().slice(0, 10);
}
