import { RAIN_WINDOW_MINUTES, type MeasuredRain } from '$features/monitoring';
import { formatDayMonthTimeWIB, formatTimeWIB } from '$shared/lib/date';
import { formatMetric } from '$shared/utils/number';

/** Warna cincin penanda PLTA yang penakarnya mencatat hujan (`chart-series-2`). */
export const MEASURED_RAIN_COLOR = '#2563eb';

export interface MeasuredRainDescription {
	/** Ringkas untuk daftar dan tooltip, mis. "0,2 mm · 10:00". */
	text: string;
	/** Kalimat utuh untuk pembaca layar. */
	spoken: string;
	tone: 'rain' | 'dry' | 'stale';
}

/**
 * Teks status hujan terukur. Sengaja tanpa kategori intensitas (ringan, lebat):
 * periode yang diwakili nilai ARR Soedirman belum dikonfirmasi backend, jadi
 * "0,2 mm" belum bisa dipetakan ke skala BMKG per jam.
 */
export function describeMeasuredRain(rain: MeasuredRain): MeasuredRainDescription {
	if (rain.status === 'raining' && rain.peak) {
		const station = rain.stationCount > 1 ? ` · ${rain.peak.station}` : '';
		const value = `${formatMetric(rain.peak.value, 1)} mm`;

		return {
			text: `${value} · ${formatTimeWIB(rain.peak.time)}${station}`,
			spoken: `Hujan terukur ${value} dalam ${RAIN_WINDOW_MINUTES} menit terakhir`,
			tone: 'rain'
		};
	}

	if (rain.status === 'dry') {
		return {
			text: rain.latestTime ? `Tidak hujan · ${formatTimeWIB(rain.latestTime)}` : 'Tidak hujan',
			spoken: 'Tidak hujan',
			tone: 'dry'
		};
	}

	// Penakar yang diam tidak boleh terbaca "tidak hujan": bisa saja sedang hujan
	// deras dan justru penakarnya yang mati.
	return {
		text: rain.latestTime
			? `Tidak diperbarui sejak ${formatDayMonthTimeWIB(rain.latestTime)}`
			: 'Belum ada pembacaan',
		spoken: 'Data penakar hujan tidak diperbarui',
		tone: 'stale'
	};
}
