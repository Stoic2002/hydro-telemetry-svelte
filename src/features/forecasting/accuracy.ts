const HOUR_MS = 60 * 60 * 1000;

/** Jendela penilaian akurasi di halaman Forecasting. */
export const ACCURACY_WINDOW_DAYS = 30;

/**
 * Rentang `start`/`end` (ISO) untuk `GET /forecasts/accuracy`: `days` hari ke
 * belakang dari sekarang, dibulatkan ke jam. Dihitung SEKALI per halaman —
 * rentang yang dihitung ulang tiap render mengubah kunci query terus-menerus
 * dan memicu permintaan tanpa henti.
 */
export function forecastAccuracyWindow(
	now = Date.now(),
	days = ACCURACY_WINDOW_DAYS
): { start: string; end: string } {
	const end = Math.floor(now / HOUR_MS) * HOUR_MS;
	return {
		start: new Date(end - days * 24 * HOUR_MS).toISOString(),
		end: new Date(end).toISOString()
	};
}
