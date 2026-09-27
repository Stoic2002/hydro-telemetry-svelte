import type { MonitoringParameterLatest } from './model';

/**
 * Hujan terukur dari penakar hujan (ARR) milik PLTA sendiri — pengukuran,
 * bukan perkiraan seperti citra awan Himawari di peta yang sama.
 *
 * Yang diketahui dari data staging per 25 Sep 2026:
 *
 * - Setiap stasiun mengirim tiap jam tepat (:00), **termasuk 0 saat kering**.
 *   Jadi 0 berarti tidak hujan, sedangkan tidak ada pembacaan berarti
 *   penakarnya bermasalah — keduanya harus tampil berbeda.
 * - Stasiun ARR Soedirman (OPC UA) juga melapor di tengah jam begitu nilainya
 *   berubah, dan nilainya berupa **keadaan**, bukan pertambahan: 03.56 = 0,2,
 *   04.00 = 0,2, 04.06 = 0. Menjumlahkannya menghitung hujan yang sama dua kali,
 *   karena itu jendela diringkas dengan **maksimum**, bukan jumlah.
 * - Waktu di snapshot `/monitoring/.../latest` untuk ARR Soedirman tertinggal
 *   berhari-hari, padahal `/trends` menunjukkan pembacaan tiap jam — snapshot
 *   tampaknya tidak diperbarui saat nilainya 0. Karena itu "masih mengirim"
 *   dinilai dari pembacaan terakhir di /trends juga, bukan snapshot saja.
 * - Periode yang diwakili nilai itu (10 menit? 1 jam?) belum dikonfirmasi
 *   backend. Sampai itu jelas, kategori intensitas BMKG tidak ditampilkan —
 *   "0,2 mm" bisa berarti hujan ringan atau cukup deras tergantung periodenya.
 */

/** Jendela bergulir ke belakang dari sekarang, bukan jam kalender. */
export const RAIN_WINDOW_MINUTES = 60;

/**
 * Lewat dari ini tanpa pembacaan, penakar dianggap tidak mengirim. Sama dengan
 * ambang merah sensor per jam di Hidrologi Harian: dua pembacaan terlewat.
 */
export const RAIN_GAUGE_STALE_MINUTES = 180;

export interface RainReading {
	time: string;
	value: number;
}

export interface RainStationWindow {
	station: string;
	/** Waktu pembacaan terakhir menurut snapshot monitoring. Bisa tertinggal. */
	latestTime: string | null;
	/**
	 * Pembacaan sepanjang `RAIN_GAUGE_STALE_MINUTES` terakhir — cukup panjang
	 * untuk membuktikan penakar masih mengirim. Puncak hujan hanya diambil dari
	 * `RAIN_WINDOW_MINUTES` terakhirnya.
	 */
	readings: RainReading[];
}

export type MeasuredRainStatus = 'raining' | 'dry' | 'stale';

export interface MeasuredRain {
	pltaId: string;
	status: MeasuredRainStatus;
	/** Jumlah stasiun hujan di PLTA ini, termasuk yang tidak mengirim. */
	stationCount: number;
	/** Pembacaan tertinggi dalam jendela; hanya terisi saat `raining`. */
	peak: (RainReading & { station: string }) | null;
	/** Pembacaan terakhir dari stasiun yang masih mengirim, atau yang terakhir sama sekali bila semuanya diam. */
	latestTime: string | null;
}

/** Stasiun `rainfall` dalam satu snapshot monitoring. */
export function rainGauges(
	parameters: MonitoringParameterLatest[]
): { station: string; time: string | null }[] {
	return parameters
		.filter((parameter) => parameter.parameter === 'rainfall')
		.map((parameter) => ({ station: parameter.station, time: parameter.time }));
}

function timestamp(value: string | null): number | null {
	if (!value) return null;
	const parsed = Date.parse(value);
	return Number.isNaN(parsed) ? null : parsed;
}

function latestOf(times: (string | null)[]): string | null {
	return times.reduce<string | null>((latest, time) => {
		const current = timestamp(time);
		if (current === null) return latest;
		const previous = timestamp(latest);
		return previous === null || current > previous ? time : latest;
	}, null);
}

export function summarizeMeasuredRain(
	pltaId: string,
	stations: RainStationWindow[],
	now: number
): MeasuredRain {
	const staleBefore = now - RAIN_GAUGE_STALE_MINUTES * 60_000;
	const windowStart = now - RAIN_WINDOW_MINUTES * 60_000;

	const withLatest = stations.map((station) => ({
		...station,
		latestTime: latestOf([station.latestTime, ...station.readings.map((reading) => reading.time)])
	}));
	const reporting = withLatest.filter((station) => {
		const latest = timestamp(station.latestTime);
		return latest !== null && latest >= staleBefore;
	});

	if (reporting.length === 0) {
		return {
			pltaId,
			status: 'stale',
			stationCount: stations.length,
			peak: null,
			latestTime: latestOf(withLatest.map((station) => station.latestTime))
		};
	}

	const peak = reporting
		.flatMap((station) =>
			station.readings.map((reading) => ({ ...reading, station: station.station }))
		)
		.filter((reading) => (timestamp(reading.time) ?? 0) >= windowStart)
		.reduce<(RainReading & { station: string }) | null>(
			(highest, reading) =>
				reading.value > 0 && (!highest || reading.value > highest.value) ? reading : highest,
			null
		);

	return {
		pltaId,
		status: peak ? 'raining' : 'dry',
		stationCount: stations.length,
		peak,
		latestTime: latestOf(reporting.map((station) => station.latestTime))
	};
}
